'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, BarChart3, FileText, LineChart, Settings, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: BarChart3 },
  { href: '/reports', label: '보고서', icon: FileText },
  { href: '/analysis', label: '분석', icon: LineChart },
  { href: '/manage', label: '관리', icon: Settings },
]

export default function NavBar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">KPI Tracker</span>
          </Link>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm whitespace-nowrap transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              )
            })}

            {/* 매뉴얼 강조 버튼 */}
            <Link
              href="/manual"
              className={`flex items-center gap-1.5 px-4 py-2 ml-2 rounded-lg text-sm whitespace-nowrap transition border ${
                pathname === '/manual'
                  ? 'bg-amber-500 text-white border-amber-400 font-medium'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 hover:text-amber-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              매뉴얼
            </Link>
          </div>

          {/* 모바일 햄버거 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2.5 rounded-lg hover:bg-white/10 transition"
            aria-label="메뉴 열기"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* 모바일 메뉴 */}
        {isOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-white/10 space-y-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              )
            })}
            <Link
              href="/manual"
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition ${
                pathname === '/manual'
                  ? 'bg-amber-500 text-white font-medium'
                  : 'text-amber-300 hover:text-amber-200 hover:bg-amber-500/15'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              매뉴얼
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
