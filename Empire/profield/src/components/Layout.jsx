import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../context'
import {
  LayoutDashboard, Users, UserPlus, FileText, Briefcase, Receipt,
  Calendar, BarChart3, Wrench, Plug, Settings, Menu, X, Sparkles, LogOut
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/leads', label: 'Leads', icon: UserPlus },
  { path: '/clients', label: 'Clients', icon: Users },
  { path: '/estimates', label: 'Estimates', icon: FileText },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/invoices', label: 'Invoices', icon: Receipt },
  { path: '/schedule', label: 'Schedule', icon: Calendar },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
]

const bottomNav = [
  { path: '/services', label: 'Services', icon: Wrench },
  { path: '/jarvis', label: 'Jarvis', icon: Sparkles, highlight: true },
  { path: '/integrations', label: 'Integrations', icon: Plug },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useData()

  async function handleLogout() {
    await logout()
    setSidebarOpen(false)
    navigate('/login')
  }

  function isActive(path) {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  function NavLink({ path, label, icon: Icon, highlight, external }) {
    const active = isActive(path)
    const cls = `flex items-center gap-3 px-4 py-3 sm:py-2.5 rounded-xl text-base sm:text-sm font-medium transition-colors ${
      highlight
        ? (active ? 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30' : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/10')
        : (active ? 'bg-white/10 text-white' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5 active:bg-white/10')
    }`
    if (external) {
      return (
        <a href={path} onClick={() => setSidebarOpen(false)} className={cls}>
          <Icon className="w-5 h-5 flex-shrink-0" />
          {label}
        </a>
      )
    }
    return (
      <Link to={path}
        onClick={() => setSidebarOpen(false)}
        className={cls}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        {label}
        {highlight && <Sparkles className="w-3 h-3 ml-auto opacity-50" />}
      </Link>
    )
  }

  return (
    <div className="flex min-h-[100dvh] bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-sidebar flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-white/10">
          <Link to="/" className="flex items-center gap-3 text-lg font-bold text-white">
            <img src="/aqua-logic-plumbing-logo.jpg" alt="Aqua Logic Plumbing" className="h-10 w-10 rounded-lg object-cover bg-white/10 ring-1 ring-white/20" />
            <span className="leading-tight">Aqua Logic Plumbing</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl text-sidebar-foreground/70 hover:text-white active:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map(item => <NavLink key={item.path} {...item} />)}
        </nav>
        <div className="border-t border-white/10 py-4 px-3 space-y-0.5">
          {bottomNav.map(item => <NavLink key={item.path} {...item} />)}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="px-4 pb-2 text-xs text-sidebar-foreground/60 truncate">
              {currentUser?.email || 'Signed in'}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base sm:text-sm font-medium text-red-200 hover:text-white hover:bg-red-500/20 active:bg-red-500/30 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 sm:h-16 bg-white border-b border-gray-200 flex items-center px-3 sm:px-4 lg:px-6 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-2 sm:mr-3 inline-flex items-center justify-center min-h-[48px] min-w-[48px] rounded-xl text-gray-500 hover:text-gray-700 active:bg-gray-100">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
        </header>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
