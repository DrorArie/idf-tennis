import TennisBall from './TennisBall'

export default function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <TennisBall className="w-7 h-7" />
      <span className={`font-display text-[28px] leading-none font-bold tracking-wide ${light ? 'text-white' : 'text-court-deep'}`}>
        טניס צה״ל
      </span>
    </span>
  )
}
