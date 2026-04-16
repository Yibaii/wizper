'use client';

/**
 * /join — Anonymous identity onboarding.
 *
 * Stages:
 *   intro       → user sees what an identity is and chooses create or import
 *   backup      → freshly-created identity shown with secret; user must copy
 *                 or download before proceeding
 *   connect     → wallet needs to be connected for the main-wallet joinGroup tx
 *   join        → joinGroup button (user's main wallet signs once)
 *   ready       → all set, link to /create
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollPanel from '@/components/ui/ScrollPanel';
import PotionButton from '@/components/ui/PotionButton';
import { useApp } from '@/context/AppContext';

type Stage = 'intro' | 'backup' | 'join' | 'ready';

export default function JoinPage() {
  const router = useRouter();
  const { identity, wallet } = useApp();
  const [stage, setStage] = useState<Stage>('intro');
  const [backupChecked, setBackupChecked] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [copied, setCopied] = useState(false);

  // Stage auto-advance based on current identity state
  useEffect(() => {
    if (!identity.identity) {
      setStage('intro');
      return;
    }
    if (identity.isMember === true) {
      setStage('ready');
      return;
    }
    // Identity exists but not a member → check whether user has already
    // acknowledged backup. We can't remember "backupChecked" across reloads,
    // so default to the join stage once an identity is loaded — the backup
    // stage is only used right after create.
    if (stage === 'intro') setStage('join');
  }, [identity.identity, identity.isMember, stage]);

  async function handleCreate() {
    identity.createIdentity();
    setBackupChecked(false);
    setStage('backup');
  }

  async function handleImport() {
    try {
      identity.importIdentity(importText);
      setImportOpen(false);
      setImportText('');
      setStage('join');
    } catch (e) {
      alert('Invalid secret: ' + (e as Error).message);
    }
  }

  function handleCopy() {
    const s = identity.exportSecret();
    if (!s) return;
    navigator.clipboard.writeText(s).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const s = identity.exportSecret();
    if (!s) return;
    const blob = new Blob(
      [JSON.stringify({
        type: 'wizper-identity',
        version: 1,
        secret: s,
        commitment: identity.commitment,
        stealthAddress: identity.stealthAddress,
        createdAt: new Date().toISOString(),
        warning: 'Keep this file private. Anyone with it can impersonate you.',
      }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wizper-identity-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleJoin() {
    setJoinError(null);
    try {
      await identity.joinGroup();
      setStage('ready');
    } catch (e) {
      setJoinError((e as Error).message);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-10">
      <h1 className="font-pixel text-[14px] text-wizard-cyan text-glow-cyan text-center mb-6">
        ✦ Become Anonymous
      </h1>

      <AnimatePresence mode="wait">
        {/* ─── INTRO ─── */}
        {stage === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScrollPanel className="mb-4">
              <p className="text-[11px] leading-relaxed mb-3">
                To post on Wizper anonymously, you need a <strong>Semaphore identity</strong> —
                a secret only you know. It proves you belong to the Wizper group
                without revealing who you are.
              </p>
              <p className="text-[11px] leading-relaxed mb-3">
                Your spirits will be owned by a <strong>stealth address</strong> derived
                from this secret. The stealth address has no link to your wallet on-chain.
              </p>
              <p className="text-[11px] leading-relaxed text-wizard-gold">
                ⚠ If you lose the secret, your spirits are gone forever. There is no recovery.
              </p>
            </ScrollPanel>

            <div className="flex flex-col items-center gap-3">
              <PotionButton variant="violet" onClick={handleCreate}>
                ✦ Create new identity
              </PotionButton>
              <button
                onClick={() => setImportOpen(o => !o)}
                className="font-pixel text-[9px] text-wizard-cyan/70 hover:text-wizard-cyan underline"
              >
                I already have one, import from secret
              </button>

              {importOpen && (
                <div className="w-full mt-2 space-y-2">
                  <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder="paste base64 secret here"
                    rows={3}
                    className="w-full bg-wizard-dark/60 border border-wizard-violet/30 p-2 font-mono text-[10px] text-gray-200 outline-none"
                  />
                  <div className="flex justify-center">
                    <PotionButton variant="cyan" small onClick={handleImport} disabled={!importText.trim()}>
                      Import
                    </PotionButton>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ─── BACKUP ─── */}
        {stage === 'backup' && (
          <motion.div
            key="backup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScrollPanel className="mb-4 border-wizard-gold/60">
              <p className="text-[11px] leading-relaxed text-wizard-gold mb-3">
                ⚠ Save your secret NOW.
              </p>
              <p className="text-[11px] leading-relaxed mb-3">
                Without it you cannot prove ownership of your spirits from another device,
                and if you clear browser data on this device you will lose everything.
              </p>

              <div className="bg-black/40 border border-wizard-violet/30 p-3 mb-3 space-y-2">
                <div className="text-[9px] text-wizard-cyan/70">commitment</div>
                <div className="font-mono text-[9px] break-all text-gray-300">
                  {identity.commitment}
                </div>
                <div className="text-[9px] text-wizard-cyan/70 mt-2">stealth address</div>
                <div className="font-mono text-[9px] break-all text-gray-300">
                  {identity.stealthAddress}
                </div>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                <PotionButton variant="cyan" small onClick={handleCopy}>
                  {copied ? '✓ Copied' : 'Copy secret'}
                </PotionButton>
                <PotionButton variant="violet" small onClick={handleDownload}>
                  Download JSON
                </PotionButton>
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupChecked}
                  onChange={e => setBackupChecked(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-[10px] leading-snug">
                  I have safely stored the secret. I understand it cannot be recovered.
                </span>
              </label>
            </ScrollPanel>

            <div className="flex justify-center">
              <PotionButton
                variant="gold"
                onClick={() => setStage('join')}
                disabled={!backupChecked}
              >
                ✦ Continue
              </PotionButton>
            </div>
          </motion.div>
        )}

        {/* ─── JOIN ─── */}
        {stage === 'join' && (
          <motion.div
            key="join"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScrollPanel className="mb-4">
              <p className="text-[11px] leading-relaxed mb-3">
                Now your identity needs to <strong>join the Wizper group</strong> on-chain.
                This is the one and only tx your main wallet will sign.
              </p>
              <p className="text-[11px] leading-relaxed mb-3 text-wizard-cyan/80">
                What&apos;s public: &ldquo;<em>this wallet is a member of Wizper</em>.&rdquo; Nothing more.
                Your specific posts can never be traced back to this wallet.
              </p>
              {identity.memberCount !== null && (
                <p className="text-[10px] text-wizard-violet/80">
                  current group size: <strong>{identity.memberCount}</strong>
                  {identity.memberCount < 10 && (
                    <span className="text-wizard-gold"> — small anonymity set; consider waiting until it grows</span>
                  )}
                </p>
              )}
            </ScrollPanel>

            {!wallet.connected ? (
              <div className="flex flex-col items-center gap-2">
                <p className="font-pixel text-[9px] text-wizard-gold">Connect your wallet first</p>
                <PotionButton variant="violet" onClick={wallet.connect}>
                  Connect Wallet
                </PotionButton>
              </div>
            ) : (
              <div className="flex justify-center">
                <PotionButton
                  variant="cyan"
                  onClick={handleJoin}
                  disabled={identity.joining}
                >
                  {identity.joining ? '✦ Joining…' : '✦ Join Group'}
                </PotionButton>
              </div>
            )}

            {joinError && (
              <p className="mt-3 font-pixel text-[9px] text-wizard-ember text-center break-all">
                {joinError}
              </p>
            )}
          </motion.div>
        )}

        {/* ─── READY ─── */}
        {stage === 'ready' && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ScrollPanel className="mb-4 border-wizard-cyan/40">
              <p className="text-[11px] leading-relaxed mb-3 text-wizard-cyan">
                ✦ You are now part of the Wizper group.
              </p>
              <p className="text-[11px] leading-relaxed mb-3">
                From here on, only this browser holds the key to your spirits.
                Back up your secret any time from this page.
              </p>

              <div className="bg-black/40 border border-wizard-violet/30 p-3 space-y-2">
                <div className="text-[9px] text-wizard-cyan/70">your stealth address</div>
                <div className="font-mono text-[9px] break-all text-gray-300">
                  {identity.stealthAddress}
                </div>
              </div>
            </ScrollPanel>

            <div className="flex justify-center gap-3 flex-wrap">
              <PotionButton variant="violet" onClick={() => router.push('/create')}>
                ✦ Start Creating
              </PotionButton>
              <PotionButton variant="cyan" small onClick={handleCopy}>
                {copied ? '✓ Copied' : 'Copy secret'}
              </PotionButton>
              <PotionButton variant="cyan" small onClick={handleDownload}>
                Download JSON
              </PotionButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
