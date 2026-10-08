export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="skeleton h-5 w-28" />
      <div className="rounded-[28px] bg-court/90 h-64 court-lines" />
      <div className="skeleton h-36 rounded-[24px]" />
      <div className="skeleton h-40 rounded-[24px]" />
    </div>
  )
}
