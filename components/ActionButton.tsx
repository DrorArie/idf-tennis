'use client'
import { useState, useTransition } from 'react'

type Result = { ok: true; message?: string } | { ok: false; error: string }

interface Props {
  action: () => Promise<Result>
  children: React.ReactNode
  pendingLabel?: string
  // When set, the first tap asks for confirmation with this label; the second tap runs the action
  confirmLabel?: string
  className?: string
  variant?: 'primary' | 'ball' | 'danger' | 'ghost' | 'quiet'
  size?: 'lg' | 'sm'
}

const VARIANTS = {
  primary: 'bg-court text-white hover:bg-court-deep shadow-[0_6px_0_0_var(--color-court-night)] active:shadow-none active:translate-y-[6px]',
  ball: 'bg-ball text-court-night hover:bg-ball-deep shadow-[0_6px_0_0_var(--color-ball-deep)] active:shadow-none active:translate-y-[6px]',
  danger: 'bg-white text-fault border-2 border-fault/25 hover:border-fault/60 hover:bg-fault/5',
  ghost: 'bg-white/10 text-white border border-white/25 hover:bg-white/20',
  quiet: 'bg-chalk text-ink-soft hover:bg-line',
}

export default function ActionButton({
  action, children, pendingLabel = 'רגע…', confirmLabel, className = '', variant = 'primary', size = 'lg',
}: Props) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  function run() {
    if (confirmLabel && !confirming) {
      setConfirming(true)
      setTimeout(() => setConfirming(false), 4000)
      return
    }
    setConfirming(false)
    setError('')
    startTransition(async () => {
      try {
        const res = await action()
        if (!res.ok) setError(res.error)
      } catch {
        setError('אין חיבור, נסה שוב')
      }
    })
  }

  const sizing = size === 'lg' ? 'w-full py-4 text-lg rounded-2xl' : 'px-3 py-1.5 text-sm rounded-xl'
  const tone = confirming ? 'bg-fault text-white border-transparent shadow-none' : VARIANTS[variant]

  return (
    <div className={size === 'lg' ? 'w-full' : 'inline-block'}>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={`${sizing} ${tone} font-semibold transition-all duration-150 disabled:opacity-60 disabled:cursor-wait cursor-pointer ${className}`}
      >
        {pending ? pendingLabel : confirming ? confirmLabel : children}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-fault bg-fault/10 rounded-xl px-3 py-2 text-center animate-pop">
          {error}
        </p>
      )}
    </div>
  )
}
