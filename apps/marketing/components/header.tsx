import Link from 'next/link'
import { Wrench } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-gray-900 sticky top-0 z-50 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">FieldPro</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link href="/features" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
            Features
          </Link>
          <Link href="/pricing" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
            Pricing
          </Link>
          <Link href="#testimonials" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">
            Reviews
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000/login"
            className="text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            Sign In
          </a>
          <a
            href="http://localhost:3000/signup"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </header>
  )
}
