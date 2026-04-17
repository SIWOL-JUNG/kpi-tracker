'use client'

import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon?: LucideIcon
  label: string
  value: string | number
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  className?: string
}

const COLOR_MAP = {
  blue: { border: 'border-l-blue-600', bg: 'bg-gray-900', icon: 'text-blue-400', value: 'text-white' },
  green: { border: 'border-l-green-600', bg: 'bg-gray-900', icon: 'text-green-400', value: 'text-green-400' },
  yellow: { border: 'border-l-yellow-500', bg: 'bg-gray-900', icon: 'text-yellow-400', value: 'text-yellow-400' },
  red: { border: 'border-l-red-600', bg: 'bg-gray-900', icon: 'text-red-400', value: 'text-red-400' },
  purple: { border: 'border-l-blue-600', bg: 'bg-gray-900', icon: 'text-blue-400', value: 'text-blue-400' },
}

export default function StatCard({ icon: Icon, label, value, color, className = '' }: StatCardProps) {
  const colors = COLOR_MAP[color]

  return (
    <div className={`${colors.bg} rounded-xl border border-gray-700 p-5 border-l-4 ${colors.border} ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${colors.icon}`} />}
        <span className="text-sm text-gray-400 font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
    </div>
  )
}
