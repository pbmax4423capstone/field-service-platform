import { Wrench, AlertCircle } from 'lucide-react'

export default function PortalExpiredPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-900 text-sm">DispatchForce AI</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">This link has expired</h1>
        <p className="text-gray-500 text-base max-w-md mx-auto">
          Your service history link is no longer valid. Please contact your service provider to
          request a new link.
        </p>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by DispatchForce AI
      </footer>
    </div>
  )
}
