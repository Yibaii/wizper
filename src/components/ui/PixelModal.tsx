'use client';

import { useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function PixelModal({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-lg border-2 border-wizard-violet bg-wizard-purple/95 p-6 shadow-[0_0_40px_#b24bf340]"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-wizard-cyan" />
            <div className="absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-wizard-cyan" />
            <div className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-wizard-cyan" />
            <div className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2 border-wizard-cyan" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 font-pixel text-[10px] text-wizard-cyan hover:text-white transition-colors cursor-pointer"
            >
              ✕
            </button>

            {title && (
              <h2 className="font-pixel text-sm text-wizard-cyan mb-4 text-glow-cyan">
                {title}
              </h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
