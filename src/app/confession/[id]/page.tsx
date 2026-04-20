'use client';

import { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import WizardCharacter from '@/components/confession/WizardCharacter';
import ScrollPanel from '@/components/ui/ScrollPanel';
import MintBadge from '@/components/ui/MintBadge';
import ZKShield from '@/components/ui/ZKShield';
import PotionButton from '@/components/ui/PotionButton';
import LinkRequestCard from '@/components/connection/LinkRequestCard';
import { EMOTION_LABELS } from '@/lib/emotions';
import { formatDate, hasCJK } from '@/lib/utils';
import { linkId as computeLinkId } from '@/lib/link';
import type { Confession } from '@/data/mock';

function deriveRelated(
  all: Confession[],
  current: Confession,
): Confession[] {
  // Same emotion, minted, not the current one, exclude already-confirmed links.
  const alreadyLinked = new Set([
    ...current.linkedIds,
    ...current.pendingLinkIds,
    current.id,
  ]);

  // DB may contain duplicates of the same on-chain spirit — e.g. a legacy
  // row and a recovered row. Dedupe by tokenId (if on-chain) or by text
  // as a fallback, so the list shows each spirit once.
  const result: Confession[] = [];
  const seen = new Set<string>();
  for (const c of all) {
    if (!c.minted || c.emotion !== current.emotion) continue;
    if (alreadyLinked.has(c.id)) continue;
    const key = c.tokenId ? `tok:${c.tokenId}` : `txt:${c.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
    if (result.length >= 5) break;
  }
  return result;
}

export default function ConfessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    feedExpressions,
    myExpressions,
    links,
    identity,
    requestLinkOnchain,
    confirmLinkOnchain,
  } = useApp();

  const allMap = useMemo(
    () => new Map([...feedExpressions, ...myExpressions].map(c => [c.id, c])),
    [feedExpressions, myExpressions],
  );
  const confessionMaybe = allMap.get(id);

  const [linkBusy, setLinkBusy] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [pendingLocal, setPendingLocal] = useState<Set<string>>(new Set());
  const [confirmedLocal, setConfirmedLocal] = useState<Set<string>>(new Set());

  const related = useMemo(
    () =>
      confessionMaybe
        ? deriveRelated([...feedExpressions, ...myExpressions], confessionMaybe)
        : [],
    [feedExpressions, myExpressions, confessionMaybe],
  );

  if (!confessionMaybe) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-pixel text-sm text-gray-500 mb-4">Wizper not found</p>
          <PotionButton variant="cyan" onClick={() => router.push('/feed')}>
            ← Back to Feed
          </PotionButton>
        </div>
      </div>
    );
  }

  const confession: Confession = confessionMaybe;
  const emotionInfo = EMOTION_LABELS[confession.emotion] ?? EMOTION_LABELS.confusion;
  const myStealth = identity.stealthAddress?.toLowerCase();
  const iOwnThis = myExpressions.some(c => c.id === confession.id);

  // Derive link status from the global chain-backed `links` state.
  // - confirmed: any link between this and otherId has status confirmed
  // - pending-mine: there is a pending link originating FROM this spirit
  //                 (so I — the owner — initiated it)
  // - pending-theirs: pending link originating FROM otherId to this
  //                   (the other side asked, I can confirm)
  function linkStatus(otherId: string): 'none' | 'pending-mine' | 'pending-theirs' | 'confirmed' {
    if (confirmedLocal.has(otherId)) return 'confirmed';
    for (const l of links) {
      const involves =
        (l.fromId === confession.id && l.toId === otherId) ||
        (l.fromId === otherId && l.toId === confession.id);
      if (!involves) continue;
      if (l.status === 'confirmed') return 'confirmed';
      if (l.fromId === confession.id) return 'pending-mine';
      return 'pending-theirs';
    }
    if (pendingLocal.has(otherId)) return 'pending-mine';
    return 'none';
  }

  async function handleRequest(other: Confession) {
    if (!confession.tokenId || !other.tokenId) {
      setLinkError('Both wizards must be minted on-chain before linking');
      return;
    }
    if (!iOwnThis) {
      setLinkError('You can only initiate links from your own wizards');
      return;
    }

    // If the other side already sent a pending request TO this spirit,
    // the user's intent ("I also want to link") is functionally equivalent
    // to confirming. Do that instead of creating a second pending in the
    // opposite direction — one confirmation is enough.
    const reversePending = links.find(
      l => l.fromId === other.id && l.toId === confession.id && l.status === 'pending',
    );
    if (reversePending) {
      await handleConfirm(other);
      return;
    }

    setLinkBusy(other.id);
    setLinkError(null);
    try {
      await requestLinkOnchain({
        fromTokenId: BigInt(confession.tokenId),
        toTokenId: BigInt(other.tokenId),
      });
      setPendingLocal(prev => new Set(prev).add(other.id));
    } catch (e) {
      setLinkError((e as Error).message);
    } finally {
      setLinkBusy(null);
    }
  }

  async function handleConfirm(other: Confession) {
    if (!confession.tokenId || !other.tokenId) {
      setLinkError('Both wizards must be minted on-chain before linking');
      return;
    }
    // In on-chain land, confirming means: the stealth owner of `other` (the
    // `to` side of the original request) signs. We assume the current detail
    // page belongs to the `to` side; the link was requested FROM the `other`
    // spirit TO this one.
    setLinkBusy(other.id);
    setLinkError(null);
    try {
      await confirmLinkOnchain({
        fromTokenId: BigInt(other.tokenId),
        toTokenId: BigInt(confession.tokenId),
      });
      setConfirmedLocal(prev => new Set(prev).add(other.id));
    } catch (e) {
      setLinkError((e as Error).message);
    } finally {
      setLinkBusy(null);
    }
  }

  const isMinted = confession.minted;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <button
          onClick={() => router.push('/feed')}
          className="font-pixel text-[9px] text-gray-500 hover:text-wizard-cyan transition-colors mb-6 cursor-pointer"
        >
          ← Back to Feed
        </button>

        {/* Character + meta */}
        <div className="flex flex-col items-center mb-8">
          <div className="animate-float mb-4">
            <WizardCharacter text={confession.text} size={160} />
          </div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">{emotionInfo.icon}</span>
            <span className="font-pixel text-[10px] text-wizard-violet">
              {emotionInfo.en}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <MintBadge minted={isMinted} />
            <ZKShield compact />
            <span className="font-pixel text-[7px] text-gray-600">
              {formatDate(confession.createdAt)}
            </span>
          </div>
          {confession.tokenId && (
            <div className="font-pixel text-[7px] text-wizard-cyan/60 mt-2">
              tokenId #{confession.tokenId}
            </div>
          )}
        </div>

        {/* Full text */}
        <ScrollPanel className="mb-6">
          <p
            className={`leading-relaxed whitespace-pre-wrap ${
              hasCJK(confession.text)
                ? 'text-[14px] pixel-bold tracking-wide'
                : 'text-[12px]'
            }`}
          >
            {confession.text}
          </p>
        </ScrollPanel>

        {/* ZK info */}
        <div className="border border-wizard-green/20 bg-wizard-green/5 p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-lg">🛡️</span>
            <div>
              <p className="font-pixel text-[9px] text-wizard-green mb-1">
                Minted anonymously via zero-knowledge proof
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                This wizard is owned by a stealth address. No on-chain link
                exists between it and the author&apos;s main wallet.
              </p>
            </div>
          </div>
        </div>

        {linkError && (
          <div className="mb-4 border border-wizard-ember/40 bg-wizard-ember/10 p-2 font-pixel text-[9px] text-wizard-ember break-all">
            {linkError}
          </div>
        )}

        {/* Related — invite to link */}
        <div className="mb-8">
          <h3 className="font-pixel text-[10px] text-wizard-cyan mb-4 text-glow-cyan">
            ✦ Similar Wizards
          </h3>
          <div className="space-y-3">
            {related.map(r => {
              const status = linkStatus(r.id);
              if (status === 'confirmed') {
                return <LinkRequestCard key={r.id} confession={r} status="confirmed" />;
              }
              if (status === 'pending-mine') {
                // I already asked; waiting on the other side. Do nothing useful on click.
                return <LinkRequestCard key={r.id} confession={r} status="pending" />;
              }
              // For both 'pending-theirs' and 'none' the action is the same:
              // click once to link. `handleRequest` is smart — if a reverse
              // pending exists, it confirms that; otherwise it opens a new one.
              return (
                <LinkRequestCard
                  key={r.id}
                  confession={r}
                  status={status === 'pending-theirs' ? 'pending' : 'none'}
                  actionLabel={
                    iOwnThis
                      ? status === 'pending-theirs'
                        ? '✦ Accept Link'
                        : '✦ Link'
                      : undefined
                  }
                  onAction={iOwnThis && !linkBusy ? () => handleRequest(r) : undefined}
                  busy={linkBusy === r.id}
                />
              );
            })}
            {related.length === 0 && (
              <p className="font-pixel text-[8px] text-gray-600">
                No similar wizards found yet
              </p>
            )}
          </div>
          {!iOwnThis && (
            <p className="mt-3 font-pixel text-[8px] text-gray-600">
              You can only initiate or confirm links from your own wizards.
            </p>
          )}
        </div>

        {/* Confirmed links */}
        {confession.linkedIds.length > 0 && (
          <div>
            <h3 className="font-pixel text-[10px] text-wizard-green mb-4">
              ✦ Confirmed Links
            </h3>
            <div className="space-y-3">
              {confession.linkedIds.map(lid => {
                const linked = allMap.get(lid);
                if (!linked) return null;
                return (
                  <LinkRequestCard
                    key={lid}
                    confession={linked}
                    status="confirmed"
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* debug info for devs */}
        {myStealth && iOwnThis && (
          <div className="mt-8 font-pixel text-[7px] text-gray-600">
            signed by stealth: {myStealth.slice(0, 10)}…
          </div>
        )}
      </motion.div>
    </div>
  );
}
