'use client'

/**
 * Confirmation sheet shown before any Sparks spend.
 * Displays item name, cost, and the user's projected balance after purchase.
 * The user must explicitly confirm — there is no accidental one-tap purchase.
 */
interface PurchaseSheetProps {
  itemName:       string
  cost:           number
  currentBalance: number
  onConfirm:      () => void
  onCancel:       () => void
  confirming:     boolean
}

export function PurchaseSheet({
  itemName, cost, currentBalance, onConfirm, onCancel, confirming,
}: PurchaseSheetProps) {
  const afterBalance = currentBalance - cost

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button onClick={onCancel} className="flex-1 bg-black/50" aria-label="Cancel" />

      <div className="bg-[#141414] rounded-t-3xl px-5 pt-5 pb-safe-bottom pb-8">
        <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />

        <p className="text-xs font-body text-white/35 uppercase tracking-widest mb-1">
          Purchase
        </p>
        <p className="text-xl font-heading font-bold text-white mb-5">{itemName}</p>

        <div className="bg-white/[0.04] rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-white/50">Cost</span>
            <span className="text-sm font-body text-gold font-medium flex items-center gap-1">
              <span className="text-xs">⚡</span> {cost}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-white/50">Your balance</span>
            <span className="text-sm font-body text-white/70 tabular-nums">{currentBalance.toLocaleString()}</span>
          </div>
          <div className="h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-body text-white/50">After purchase</span>
            <span className="text-sm font-body text-white font-medium tabular-nums">
              {afterBalance.toLocaleString()}
            </span>
          </div>
        </div>

        <button
          onClick={onConfirm}
          disabled={confirming}
          className="w-full py-4 rounded-2xl bg-teal text-background font-body font-semibold text-base disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {confirming ? 'Unlocking…' : `Unlock for ⚡ ${cost}`}
        </button>
      </div>
    </div>
  )
}
