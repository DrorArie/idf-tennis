import TennisBall from '@/components/TennisBall'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-court-deep court-lines relative overflow-hidden flex flex-col items-center px-4 pt-14 pb-10">
      {/* Court markings */}
      <div className="absolute inset-x-6 top-6 h-[340px] border-2 border-white/10 rounded-3xl pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full border-l-2 border-white/10" />
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-white/10" />
      </div>
      <TennisBall className="absolute -left-14 top-28 w-28 h-28 rotate-[20deg]" />

      <div className="relative text-center mb-8 animate-rise">
        <h1 className="font-display font-bold text-[84px] leading-[0.85] text-white">טניס צה״ל</h1>
        <p className="text-ball font-medium mt-2">אימון טניס שבועי · כל יום שישי</p>
      </div>

      <div className="relative w-full max-w-md bg-white rounded-[28px] shadow-2xl shadow-black/30 p-7 animate-rise" style={{ animationDelay: '80ms' }}>
        {children}
      </div>
    </main>
  )
}
