'use client';

import { motion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import ConnectionGraph from '@/components/connection/ConnectionGraph';

export default function ConnectionsPage() {
  const { feedExpressions, myExpressions, links } = useApp();

  // Only minted expressions appear in the connection graph, deduplicated by id
  const allMinted = [...feedExpressions, ...myExpressions].filter(c => c.minted);
  const seen = new Set<string>();
  const confessions = allMinted.filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  const confirmedCount = links.filter(l => l.status === 'confirmed').length;
  const pendingCount = links.filter(l => l.status === 'pending').length;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col px-4 py-10 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6"
      >
        <h1 className="font-pixel text-lg text-wizard-cyan text-glow-cyan mb-2">
          ✦ Magic Connection Network
        </h1>
        <p className="font-pixel text-[8px] text-gray-500 mb-4">
          Connection Visualization — Magical bonds between wizards
        </p>

        {/* Legend */}
        <div className="flex flex-wrap gap-6 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] bg-wizard-cyan" />
            <span className="font-pixel text-[8px] text-gray-400">
              Confirmed ({confirmedCount})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] border-t-2 border-dashed border-wizard-gold" />
            <span className="font-pixel text-[8px] text-gray-400">
              Pending ({pendingCount})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-wizard-violet/60" />
            <span className="font-pixel text-[8px] text-gray-400">
              Spirit Node
            </span>
          </div>
        </div>

        {/* Info box */}
        <div className="border border-wizard-violet/20 bg-wizard-purple/20 p-3 mb-2">
          <p className="font-pixel text-[8px] text-gray-400">
            💡 Hover nodes to preview. Links are established only when both parties confirm.
          </p>
        </div>
      </motion.div>

      {/* Graph */}
      <motion.div
        className="flex-1 border border-wizard-violet/20 bg-wizard-dark/50 backdrop-blur-sm relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ minHeight: '500px' }}
      >
        {/* Corner decorations */}
        <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-wizard-cyan/40 z-10" />
        <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-wizard-cyan/40 z-10" />
        <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-wizard-cyan/40 z-10" />
        <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-wizard-cyan/40 z-10" />

        <ConnectionGraph confessions={confessions} links={links} />
      </motion.div>
    </div>
  );
}
