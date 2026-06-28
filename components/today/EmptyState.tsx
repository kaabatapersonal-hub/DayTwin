'use client'

import { motion } from 'framer-motion'

interface EmptyStateProps {
  onAddTimeBlock: () => void
  onAddQuick:     () => void
}

export function EmptyState({ onAddTimeBlock, onAddQuick }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex-1 flex flex-col items-center justify-center text-center py-10"
    >
      {/* Icon with ambient glow */}
      <div className="relative mb-8">
        <div
          className="absolute inset-0 rounded-full blur-2xl opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(45,212,191,0.35) 0%, transparent 70%)', transform: 'scale(2.5)' }}
        />
        <div className="relative w-[72px] h-[72px] rounded-[22px] bg-teal/10 border border-teal/25 flex items-center justify-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#2DD4BF"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="3"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
            <line x1="8"  y1="14" x2="8"  y2="14" strokeWidth="2.4"/>
            <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.4"/>
            <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.4"/>
          </svg>
        </div>
      </div>

      <h2 className="font-heading text-[2rem] font-bold text-white leading-tight tracking-tight mb-3">
        Your day is<br />wide open.
      </h2>
      <p className="text-sm text-white/40 font-body mb-10 max-w-[230px] leading-relaxed">
        Start with one thing — a time block for deep work, or a quick task.
      </p>

      <div className="flex flex-col gap-3 w-full">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAddTimeBlock}
          className="w-full py-4 rounded-2xl bg-teal text-background text-sm font-body font-semibold shadow-lg shadow-teal/20"
        >
          Add a time block
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onAddQuick}
          className="w-full py-4 rounded-2xl bg-white/[0.06] border border-white/[0.08] text-white/55 text-sm font-body"
        >
          Add a quick task
        </motion.button>
      </div>
    </motion.div>
  )
}
