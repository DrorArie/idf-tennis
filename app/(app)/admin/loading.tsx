export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true">
      <div className="skeleton h-12 w-48" />
      <div className="rounded-[28px] bg-court-deep h-72 court-lines" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-32 rounded-[24px]" />
      ))}
    </div>
  )
}
