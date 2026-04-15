'use client';

import { use, useState, useRef } from 'react';
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
import { formatDate } from '@/lib/utils';
import { getRelatedConfessions } from '@/data/mock';

export default function ConfessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { feedExpressions, myExpressions, links, requestLink, mintExpressionNFT, wallet, isMinting } = useApp();

  // Deduplicate: myExpressions takes priority (has both minted + un-minted)
  const allMap = new Map([...feedExpressions, ...myExpressions].map(c => [c.id, c]));
  const confession = allMap.get(id);
  const [mintingDone, setMintingDone] = useState(false);
  const wizardRef = useRef<HTMLDivElement>(null);

  if (!confession) {
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

  const related = getRelatedConfessions(id);
  const emotionInfo = EMOTION_LABELS[confession.emotion];

  function getLinkStatus(otherId: string): 'none' | 'pending' | 'confirmed' {
    if (confession!.linkedIds.includes(otherId)) return 'confirmed';
    if (confession!.pendingLinkIds.includes(otherId)) return 'pending';
    const link = links.find(
      l =>
        (l.fromId === id && l.toId === otherId) ||
        (l.toId === id && l.fromId === otherId)
    );
    if (link?.status === 'pending') return 'pending';
    if (link?.status === 'confirmed') return 'confirmed';
    return 'none';
  }

  async function handleMint() {
    if (!wallet.connected) {
      wallet.connect();
      return;
    }
    try {
      const svgEl = wizardRef.current?.querySelector('svg') ?? null;
      await mintExpressionNFT(id, confession!.text, confession!.emotion, svgEl);
      setMintingDone(true);
    } catch (err) {
      console.error('Mint failed:', err);
    }
  }

  const isMinted = confession.minted || mintingDone;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back button */}
        <button
          onClick={() => router.push('/feed')}
          className="font-pixel text-[9px] text-gray-500 hover:text-wizard-cyan transition-colors mb-6 cursor-pointer"
        >
          ← Back to Feed
        </button>

        {/* Character + meta */}
        <div className="flex flex-col items-center mb-8">
          <div className="animate-float mb-4" ref={wizardRef}>
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
        </div>

        {/* Full text */}
        <ScrollPanel className="mb-6">
          <p className="text-[12px] leading-relaxed whitespace-pre-wrap">
            {confession.text}
          </p>
        </ScrollPanel>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {!isMinted && (
            <PotionButton variant="gold" onClick={handleMint} disabled={isMinting}>
              {isMinting ? '✦ Minting…' : '✦ Mint NFT'}
            </PotionButton>
          )}
          {isMinted && (
            <span className="font-pixel text-[8px] text-wizard-gold text-glow-gold self-center">
              ✦ NFT Minted — Content ownership confirmed on-chain
            </span>
          )}
        </div>

        {/* ZK Privacy Info */}
        <div className="border border-wizard-green/20 bg-wizard-green/5 p-4 mb-8">
          <div className="flex items-start gap-3">
            <span className="text-lg">🛡️</span>
            <div>
              <p className="font-pixel text-[9px] text-wizard-green mb-1">
                Your identity is protected via ZK proofs
              </p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Content ownership is verifiable without revealing identity.
                Your data remains encrypted and your real identity is never exposed.
              </p>
            </div>
          </div>
        </div>

        {/* Similar confessions / Link requests */}
        <div className="mb-8">
          <h3 className="font-pixel text-[10px] text-wizard-cyan mb-4 text-glow-cyan">
            ✦ Similar Wizpers
          </h3>
          <div className="space-y-3">
            {related.map(r => (
              <LinkRequestCard
                key={r.id}
                confession={r}
                status={getLinkStatus(r.id)}
                onRequestLink={() => requestLink(id, r.id)}
              />
            ))}
            {related.length === 0 && (
              <p className="font-pixel text-[8px] text-gray-600">
                No similar wizpers found
              </p>
            )}
          </div>
        </div>

        {/* Linked confessions */}
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
      </motion.div>
    </div>
  );
}
