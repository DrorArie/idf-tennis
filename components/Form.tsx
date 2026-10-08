'use client'
import { useFormStatus } from 'react-dom'

const inputClass =
  'w-full rounded-2xl border-2 border-line bg-white px-4 py-3 text-base outline-none transition-colors focus:border-court disabled:bg-chalk disabled:text-ink-soft'

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  extra?: React.ReactNode
}

export function Field({ label, name, extra, className = '', ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-ink-soft">
        {label}
        {extra}
      </span>
      <input name={name} className={`${inputClass} ${className}`} {...rest} />
    </label>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  name: string
  options: { value: string; label: string }[]
  placeholder?: string
  extra?: React.ReactNode
  children?: React.ReactNode
}

export function Select({ label, name, options, placeholder, extra, children, ...rest }: SelectProps) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-ink-soft">
        {label}
        {extra}
      </span>
      {children}
      <select name={name} className={`${inputClass} select-chevron`} defaultValue={rest.defaultValue ?? ''} {...rest}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

export function SubmitButton({
  children, pendingLabel, pending: forcedPending,
}: { children: React.ReactNode; pendingLabel: string; pending?: boolean }) {
  const { pending } = useFormStatus()
  const busy = pending || forcedPending
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-2xl bg-court py-3.5 text-lg font-semibold text-white shadow-[0_5px_0_0_var(--color-court-night)] transition-all hover:bg-court-deep active:translate-y-[5px] active:shadow-none disabled:opacity-60 cursor-pointer disabled:cursor-wait"
    >
      {busy ? pendingLabel : children}
    </button>
  )
}

export function FormError({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-2xl bg-fault/10 px-4 py-3 text-sm text-fault animate-pop">{children}</p>
}

export function FormNotice({ children }: { children: React.ReactNode }) {
  return <p role="status" className="rounded-2xl bg-win/10 px-4 py-3 text-sm text-win animate-pop">{children}</p>
}
