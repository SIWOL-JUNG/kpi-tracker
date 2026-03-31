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
  blue: { border: 'border-l-blue-600', bg: 'bg-blue-50/50', icon: 'text-blue-600', value: 'text-gray-900' },
  green: { border: 'border-l-green-600', bg: 'bg-green-50/50', icon: 'text-green-600', value: 'text-green-600' },
  yellow: { border: 'border-l-yellow-500', bg: 'bg-yellow-50/50', icon: 'text-yellow-600', value: 'text-yellow-600' },
  red: { border: 'border-l-red-600', bg: 'bg-red-50/50', icon: 'text-red-600', value: 'text-red-600' },
  purple: { border: 'border-l-blue-600', bg: 'bg-blue-50/50', icon: 'text-blue-600', value: 'text-blue-600' },
}

export default function StatCard({ icon: Icon, label, value, color, className = '' }: StatCardProps) {
  const colors = COLOR_MAP[color]

  return (
    <div className={`${colors.bg} rounded-xl border-2 border-gray-200 p-5 border-l-4 ${colors.border} ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className={`w-4 h-4 ${colors.icon}`} />}
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${colors.value}`}>{value}</p>
    </div>
  )
}
