'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollPanel from '@/components/ui/ScrollPanel';
import PotionButton from '@/components/ui/PotionButton';
import ZKShield from '@/components/ui/ZKShield';
import WizardCharacter from './WizardCharacter';
import MintBadge from '@/components/ui/MintBadge';
import { useApp } from '@/context/AppContext';
import type { Emotion } from '@/data/mock';

const VALID_EMOTIONS: readonly Emotion[] = ['anger', 'sadness', 'joy', 'fear', 'confusion'];
function toEmotion(x: unknown): Emotion {
  return typeof x === 'string' && (VALID_EMOTIONS as readonly string[]).includes(x)
    ? (x as Emotion)
    : 'confusion';
}

type Phase = 'writing' | 'transforming' | 'result';
type Step = 'idle' | 'uploading' | 'proving' | 'relaying' | 'confirming';

const STEP_LABEL: Record<Step, string> = {
  idle: '',
  uploading: 'Pinning to IPFS…',
  proving: 'Generating zero-knowledge proof…',
  relaying: 'Submitting through relayer…',
  confirming: 'Waiting for on-chain confirmation…',
};

export default function CreateForm() {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [minted, setMinted] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const wizardRef = useRef<HTMLDivElement>(null);
  const { mintSpiritAnonymous, identity, isMinting } = useApp();
  const router = useRouter();

  const maxLen = 280;
  const canSubmit = text.trim().length >= 4 && text.length <= maxLen;

  const [emotion, setEmotion] = useState<Emotion>('confusion');
  const [emotionLoading, setEmotionLoading] = useState(false);

  // Defer identity-dependent UI to after mount to avoid hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  async function fetchEmotion(text: string) {
    if (!text.trim()) {
      setEmotion('confusion');
      return;
    }
    setEmotionLoading(true);
    try {
      const resp = await fetch('/api/emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const result = await resp.json();
      setEmotion(toEmotion(result?.label));
    } catch {
      setEmotion('confusion');
    } finally {
      setEmotionLoading(false);
    }
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    fetchEmotion(e.target.value);
  }

  async function handleTransform() {
    if (!canSubmit || emotionLoading) return;
    if (!identity.identity || identity.isMember !== true) {
      router.push('/join');
      return;
    }

    setError(null);
    setTxHash(null);
    setPhase('transforming');

    // Progress tracking: we flip setStep during the mint by wrapping fetch.
    // The underlying `mintSpiritAnonymous` does upload → proof → relay → wait
    // in sequence; we approximate via timers + the isMinting flag. A more
    // accurate version would thread a progress callback through — Phase 1.x.
    setStep('uploading');
    const id = `c-${Date.now()}`;
    // Let the user briefly see the "uploading" label before "proving" kicks in.
    const stepTimer1 = setTimeout(() => setStep('proving'), 800);
    const stepTimer2 = setTimeout(() => setStep('relaying'), 3000);
    const stepTimer3 = setTimeout(() => setStep('confirming'), 5000);

    try {
      const svgEl = wizardRef.current?.querySelector('svg') ?? null;
      const { txHash: hash } = await mintSpiritAnonymous({
        id,
        text: text.trim(),
        emotion,
        svgElement: svgEl,
      });
      setTxHash(hash);
      setMinted(true);
      setPhase('result');
    } catch (err) {
      console.error('[create] mint failed:', err);
      setError((err as Error).message || 'Mint failed');
      setPhase('writing');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setStep('idle');
    }
  }

  // ─── Identity gate ─────────────────────────────────────────
  // Shown above the form when the user isn't ready to mint anonymously.
  const identityBanner = (() => {
    if (!mounted) return null;
    if (!identity.identity) {
      return (
        <div className="mb-4 border border-wizard-violet/40 bg-wizard-violet/10 p-3 text-[10px] leading-snug">
          <div className="font-pixel text-wizard-violet mb-1">✦ Anonymous identity required</div>
          <p className="mb-2">
            Wizper posts are signed by a Semaphore identity, not your wallet. You need one to mint.
          </p>
          <PotionButton variant="violet" small onClick={() => router.push('/join')}>
            Set up identity
          </PotionButton>
        </div>
      );
    }
    if (identity.isMember === false) {
      return (
        <div className="mb-4 border border-wizard-gold/40 bg-wizard-gold/10 p-3 text-[10px] leading-snug">
          <div className="font-pixel text-wizard-gold mb-1">✦ Join the group first</div>
          <p className="mb-2">
            You have an identity but haven&apos;t joined the Wizper group on-chain yet.
            One tx from your main wallet is required.
          </p>
          <PotionButton variant="gold" small onClick={() => router.push('/join')}>
            Finish joining
          </PotionButton>
        </div>
      );
    }
    if (identity.isMember === null) {
      return (
        <div className="mb-4 border border-wizard-cyan/20 p-3 text-[10px]">
          <span className="font-pixel text-wizard-cyan/70">Checking group membership…</span>
        </div>
      );
    }
    return null;
  })();

  return (
    <div className="w-full max-w-xl mx-auto">
      <AnimatePresence mode="wait">
        {/* ---- Phase 1: Writing ---- */}
        {phase === 'writing' && (
          <motion.div
            key="writing"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="mb-4">
              <ZKShield />
            </div>

            {identityBanner}

            <ScrollPanel className="mb-4">
              <textarea
                value={text}
                onChange={handleTextChange}
                placeholder="Write your confession here…"
                maxLength={maxLen}
                rows={6}
                className="w-full bg-transparent resize-none outline-none text-[#5a3e28] placeholder:text-[#7a5a40]/60 font-pixel text-[11px] leading-relaxed"
              />
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-wizard-parchment-dark/20">
                <span className="font-pixel text-[8px] text-[#7a5a40]/80">
                  {text.length}/{maxLen}
                </span>
                <span className="font-pixel text-[8px] text-[#7a5a40]/70">
                  {emotionLoading ? 'Detecting emotion…' : `✦ Detected: ${emotion}`}
                </span>
              </div>
            </ScrollPanel>

            <div className="flex justify-center">
              <PotionButton
                variant="violet"
                onClick={handleTransform}
                disabled={!canSubmit || isMinting}
              >
                {isMinting ? '✦ Minting…' : '✦ Transform into Wizard'}
              </PotionButton>
            </div>

            {error && (
              <p className="mt-3 font-pixel text-[9px] text-wizard-ember text-center break-all">
                {error}
              </p>
            )}
          </motion.div>
        )}

        {/* ---- Phase 2: Transforming ---- */}
        {phase === 'transforming' && (
          <motion.div
            key="transforming"
            className="flex flex-col items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-wizard-violet rounded-full"
                  style={{ left: '50%', top: '50%' }}
                  animate={{
                    x: [0, Math.cos((i * Math.PI) / 4) * 60],
                    y: [0, Math.sin((i * Math.PI) / 4) * 60],
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
              <motion.div
                animate={{ rotate: 360, scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <WizardCharacter text={text} size={100} />
              </motion.div>
            </div>
            <p className="font-pixel text-[10px] text-wizard-violet mt-6 text-glow-violet">
              ✦ Transforming your emotions…
            </p>
            <p className="font-pixel text-[8px] text-wizard-cyan/70 mt-2">
              {STEP_LABEL[step]}
            </p>
          </motion.div>
        )}

        {/* ---- Phase 3: Result ---- */}
        {phase === 'result' && (
          <motion.div
            key="result"
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          >
            <p className="font-pixel text-[10px] text-wizard-cyan mb-4 text-glow-cyan">
              ✦ Your Wizard is Born
            </p>

            <div className="animate-float mb-6" ref={wizardRef}>
              <WizardCharacter text={text} size={160} />
            </div>

            <ScrollPanel className="w-full mb-6">
              <p className="text-[11px] leading-relaxed">{text}</p>
            </ScrollPanel>

            <div className="flex items-center gap-2 mb-6">
              <MintBadge minted={minted} />
              <ZKShield compact />
            </div>

            <div className="flex gap-4 mb-4">
              <PotionButton
                variant="cyan"
                onClick={() => router.push('/feed')}
              >
                ✦ View Feed
              </PotionButton>
              <PotionButton
                variant="violet"
                onClick={() => router.push('/my')}
              >
                ✦ My Wizards
              </PotionButton>
            </div>

            {minted && txHash && (
              <motion.p
                className="font-pixel text-[8px] text-wizard-gold text-glow-gold break-all px-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                NFT minted anonymously. tx:&nbsp;
                <a
                  href={`https://sepolia.basescan.org/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {txHash.slice(0, 10)}…
                </a>
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
