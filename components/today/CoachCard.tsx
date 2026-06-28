'use client'

import { useState, useEffect } from 'react'
import { motion }               from 'framer-motion'
import { buildCoachMessage, type TonePreference } from '@/lib/copy'
import type { CoachData } from '@/types'

interface CoachCardProps {
  data:            CoachData
  tonePreference?: TonePreference
}

export function CoachCard({ data, tonePreference = 'warm' }: CoachCardProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (new Date().getHours() >= 12) setVisible(false)
  }, [])

  if (!visible) return null

  const message = buildCoachMessage(data, tonePreference)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative overflow-hidden rounded-2xl px-4 py-4 mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(45,212,191,0.07) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(45,212,191,0.13)',
      }}
    >
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r bg-teal/50" />
      <p className="text-[10px] font-body text-teal/60 uppercase tracking-[0.12em] mb-1.5">
        Good morning
      </p>
      <p className="text-sm font-body text-white/75 leading-relaxed">
        {message}
      </p>
    </motion.div>
  )
}
