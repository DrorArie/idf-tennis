export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="rounded-[28px] bg-court-deep h-52 court-lines" />
      <div className="skeleton h-80 rounded-[24px]" />
      <div className="skeleton h-48 rounded-[24px]" />
    </div>
  )
}
