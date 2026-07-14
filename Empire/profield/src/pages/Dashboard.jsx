import { useData } from '../context'
import { formatCurrency } from '../store'
import { Briefcase, Users, FileText, Receipt, TrendingUp, Clock } from 'lucide-react'

export default function Dashboard() {
  const { data } = useData()

  const stats = [
    { label: 'Active Jobs', value: data.jobs?.filter(j => j.status === 'in_progress').length ?? 0, icon: Briefcase, color: 'bg-blue-500' },
    { label: 'Clients', value: data.clients?.length ?? 0, icon: Users, color: 'bg-green-500' },
    { label: 'Open Estimates', value: data.estimates?.filter(e => e.status === 'sent' || e.status === 'draft').length ?? 0, icon: FileText, color: 'bg-yellow-500' },
    { label: 'Unpaid Invoices', value: data.invoices?.filter(i => i.status !== 'paid').length ?? 0, icon: Receipt, color: 'bg-red-500' },
    { label: 'Revenue (MTD)', value: formatCurrency(data.invoices?.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0) ?? 0), icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Leads', value: data.leads?.length ?? 0, icon: Clock, color: 'bg-orange-500' },
  ]

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
            <div className={`${color} rounded-lg p-3`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xl font-semibold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Recent Jobs</h2>
          {data.jobs?.length ? (
            <ul className="divide-y divide-gray-100">
              {data.jobs.slice(0, 5).map(job => (
                <li key={job.id} className="py-2 flex justify-between text-sm">
                  <span className="text-gray-700">{job.title || job.job_number}</span>
                  <span className="capitalize text-gray-400">{job.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No jobs yet</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Recent Leads</h2>
          {data.leads?.length ? (
            <ul className="divide-y divide-gray-100">
              {data.leads.slice(0, 5).map(lead => (
                <li key={lead.id} className="py-2 flex justify-between text-sm">
                  <span className="text-gray-700">{lead.name}</span>
                  <span className="capitalize text-gray-400">{lead.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No leads yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
