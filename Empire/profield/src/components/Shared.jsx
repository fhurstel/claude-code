import { ChevronDown } from 'lucide-react'

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>
}

export function Button({ children, variant = 'primary', size = 'md', onClick, className = '', disabled = false, type = 'button' }) {
  const base = 'inline-flex min-h-[48px] min-w-[48px] touch-manipulation select-none items-center justify-center gap-2 font-medium text-base sm:text-sm rounded-xl transition-all duration-150 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  }
  const sizes = { sm: 'px-3 py-2 text-sm', md: 'px-4 py-2.5 text-sm sm:text-sm', lg: 'px-6 py-3 text-base' }
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}>{children}</button>
}

export function Table({ headers, children, emptyMessage = 'No data' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
          <tr>{headers.map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">{children}</tbody>
      </table>
    </div>
  )
}

export function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      {Icon && <Icon className="w-10 h-10 text-gray-300 mx-auto mb-3" />}
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatTabs({ tabs, active, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
      {tabs.map(t => (
        <button key={t.value} onClick={() => onChange(t.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${active === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          {t.label} {t.count !== undefined && <span className="ml-1 text-gray-400">({t.count})</span>}
        </button>
      ))}
    </div>
  )
}

export function Input({ label, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input className={`w-full min-h-[44px] px-3 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${className}`} {...props} />
    </div>
  )
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <textarea className={`w-full min-h-[44px] px-3 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${className}`} {...props} />
    </div>
  )
}

export function Select({ label, options, children, className = '', ...props }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <div className="relative">
        <select className={`w-full min-h-[44px] appearance-none px-3 pr-10 py-2.5 border border-gray-300 rounded-xl text-base sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent ${className}`} {...props}>
        {options ? options.map(o => <option key={o.value} value={o.value}>{o.label}</option>) : children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    </div>
  )
}

export function FormField({ label, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      {children}
    </div>
  )
}

export function KpiCard({ label, value, icon: Icon, color = 'bg-blue-500' }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </div>
    </Card>
  )
}

export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className={`bg-white rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto w-full ${wide ? 'sm:max-w-4xl' : 'sm:max-w-lg'}`} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 sm:p-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl text-gray-400 hover:text-gray-600 active:bg-gray-200 text-2xl leading-none -mr-1">&times;</button>
        </div>
        <div className="p-5 sm:p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}
