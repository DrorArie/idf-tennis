export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🎾 IDF Tennis</h1>
          <p className="text-sm text-gray-500 mt-1">Weekly sessions signup</p>
        </div>
        {children}
      </div>
    </main>
  )
}
