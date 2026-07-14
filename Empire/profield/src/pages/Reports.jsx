import { useData } from '../context'
import { formatCurrency, calcEstimateTotal } from '../store'
import { PageHeader, Card } from '../components/Shared'

export default function Reports() {
  const { estimates, jobs, invoices, clients, leads } = useData()

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0)
  const pendingAmount = invoices.filter(i => i.status === 'sent' || i.status === 'partial').reduce((s, i) => s + (i.balance || i.total || 0), 0)
  const approvedEstimates = estimates.filter(e => e.status === 'approved' || e.status === 'converted')
  const totalEstimateValue = approvedEstimates.reduce((s, e) => s + (e.subtotal || 0) - (e.discount_amount || 0), 0)
  const conversionRate = estimates.length > 0 ? ((estimates.filter(e => e.status === 'converted').length / estimates.length) * 100).toFixed(1) : 0
  const leadConversionRate = leads.length > 0 ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1) : 0

  // All invoices stats
  const totalInvoices = invoices.length
  const totalInvoiceValue = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const draftInvoices = invoices.filter(i => i.status === 'draft')
  const draftInvoiceCount = draftInvoices.length
  const draftInvoiceTotal = draftInvoices.reduce((s, i) => s + (i.total || 0), 0)
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const overdueInvoiceCount = overdueInvoices.length
  const overdueInvoiceTotal = overdueInvoices.reduce((s, i) => s + (i.balance || i.total || 0), 0)

  // Invoice status breakdown
  const invoiceStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Business analytics and insights" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-800">{totalInvoices}</p>
          <p className="text-xs text-gray-400">{formatCurrency(totalInvoiceValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Draft Invoices</p>
          <p className="text-2xl font-bold text-orange-600">{draftInvoiceCount}</p>
          <p className="text-xs text-gray-400">{formatCurrency(draftInvoiceTotal)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Pending Amount</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingAmount)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Estimate Value</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalEstimateValue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Conversion Rate</p>
          <p className="text-2xl font-bold text-purple-600">{conversionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Lead Conversion</p>
          <p className="text-2xl font-bold text-indigo-600">{leadConversionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Overdue Invoices</p>
          <p className="text-2xl font-bold text-red-600">{overdueInvoiceCount}</p>
          <p className="text-xs text-gray-400">{formatCurrency(overdueInvoiceTotal)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Invoice Status</h3>
          <div className="space-y-2">
            {invoiceStatuses.map(status => {
              const count = invoices.filter(i => i.status === status).length
              const total = invoices.filter(i => i.status === status).reduce((s, i) => s + (i.total || 0), 0)
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-gray-400 ml-2">{formatCurrency(total)}</span>
                  </div>
                </div>
              )
            })}
            <div className="flex items-center justify-between border-t pt-1">
              <span className="text-sm font-semibold">Total</span>
              <div className="text-right">
                <span className="text-sm font-bold">{totalInvoices}</span>
                <span className="text-xs text-gray-400 ml-2">{formatCurrency(totalInvoiceValue)}</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Job Status</h3>
          <div className="space-y-2">
            {['scheduled', 'in_progress', 'completed', 'cancelled'].map(status => {
              const count = jobs.filter(j => j.status === status).length
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Lead Funnel</h3>
          <div className="space-y-2">
            {['new', 'contacted', 'qualified', 'converted', 'lost'].map(status => {
              const count = leads.filter(l => l.status === status).length
              return (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{status}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {invoices.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3">All Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Number</th>
                  <th className="text-left py-2 px-2">Client</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-right py-2 px-2">Paid</th>
                  <th className="text-right py-2 px-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {([...invoices].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))).map(inv => (
                  <tr key={inv.id} className="border-b border-gray-100">
                    <td className="py-2 px-2 font-medium">{inv.invoice_number}</td>
                    <td className="py-2 px-2 text-gray-600">{inv.client_name}</td>
                    <td className="py-2 px-2 capitalize">{inv.status}</td>
                    <td className="py-2 px-2 text-right">{formatCurrency(inv.total || 0)}</td>
                    <td className="py-2 px-2 text-right text-green-600">{formatCurrency(inv.amount_paid || 0)}</td>
                    <td className="py-2 px-2 text-right text-red-600">{formatCurrency(inv.balance_due || inv.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
