'use client';

import { motion } from 'framer-motion';
import CreateForm from '@/components/confession/CreateForm';

export default function CreatePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        className="w-full max-w-xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page header */}
        <div className="text-center mb-8">
          <h1 className="font-pixel text-lg text-wizard-violet text-glow-violet mb-2">
            ✦ Write Your Wizper
          </h1>
          <p className="font-pixel text-[9px] text-gray-500">
            It will transform into your unique emotion wizard
          </p>
        </div>

        <CreateForm />
      </motion.div>
    </div>
  );
}
