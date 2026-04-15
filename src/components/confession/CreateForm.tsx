'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ScrollPanel from '@/components/ui/ScrollPanel';
import PotionButton from '@/components/ui/PotionButton';
import ZKShield from '@/components/ui/ZKShield';
import WizardCharacter from './WizardCharacter';
import MintBadge from '@/components/ui/MintBadge';
import { useApp } from '@/context/AppContext';
import { detectEmotion } from '@/lib/emotions';

type Phase = 'writing' | 'transforming' | 'result';

export default function CreateForm() {
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('writing');
  const [minted, setMinted] = useState(false);
  const [confessionId, setConfessionId] = useState<string>('');
  const wizardRef = useRef<HTMLDivElement>(null);
  const { addConfession, mintExpressionNFT, wallet, isMinting } = useApp();
  const router = useRouter();

  const maxLen = 280;
  const canSubmit = text.trim().length >= 4 && text.length <= maxLen;

  const emotion = text.trim() ? detectEmotion(text) : 'confusion';

  function handleTransform() {
    if (!canSubmit) return;
    setPhase('transforming');

    const id = `c-${Date.now()}`;
    setConfessionId(id);
    addConfession({
      id,
      text: text.trim(),
      emotion,
      minted: false,
      createdAt: new Date().toISOString(),
      linkedIds: [],
      pendingLinkIds: [],
    });

    setTimeout(() => setPhase('result'), 1500);
  }

  async function handleMint() {
    if (!wallet.connected) {
      wallet.connect();
      return;
    }
    try {
      const svgEl = wizardRef.current?.querySelector('svg') ?? null;
      await mintExpressionNFT(confessionId, text.trim(), emotion, svgEl);
      setMinted(true);
    } catch (err) {
      console.error('Mint failed:', err);
    }
  }

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

            <ScrollPanel className="mb-4">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
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
                  ✦ Content will be anonymously encrypted on-chain
                </span>
              </div>
            </ScrollPanel>

            <div className="flex justify-center">
              <PotionButton
                variant="violet"
                onClick={handleTransform}
                disabled={!canSubmit}
              >
                ✦ Transform into Spirit
              </PotionButton>
            </div>
          </motion.div>
        )}

        {/* ---- Phase 2: Transforming Animation ---- */}
        {phase === 'transforming' && (
          <motion.div
            key="transforming"
            className="flex flex-col items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative">
              {/* Sparkle ring */}
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-wizard-violet rounded-full"
                  style={{
                    left: '50%',
                    top: '50%',
                  }}
                  animate={{
                    x: [0, Math.cos((i * Math.PI) / 4) * 60],
                    y: [0, Math.sin((i * Math.PI) / 4) * 60],
                    scale: [0, 1.5, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
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
              ✦ Your Spirit is Born
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
              <PotionButton variant="gold" onClick={handleMint} disabled={minted || isMinting}>
                {isMinting ? '✦ Minting…' : minted ? '✦ NFT Minted' : '✦ Mint NFT'}
              </PotionButton>
              <PotionButton
                variant="cyan"
                onClick={() => router.push('/feed')}
              >
                ✦ View Feed
              </PotionButton>
            </div>

            {minted && (
              <motion.p
                className="font-pixel text-[8px] text-wizard-gold text-glow-gold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                NFT minted! Content ownership confirmed on-chain
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
