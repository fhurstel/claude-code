import { useParams } from 'react-router-dom'
import { useData } from '../context'
import { formatCurrency, formatDate, calcLineItemTotal } from '../store'

export default function InvoicePdfView() {
  const { invoiceId } = useParams()
  const { invoices } = useData()
  const invoice = invoiceId ? invoices.find(i => i.id === invoiceId) : null

  if (!invoice) {
    return (
      <div style={{ padding: 32, fontFamily: 'Arial, sans-serif' }}>
        <h2>Invoice Not Found</h2>
        <p>The invoice PDF view could not be found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black py-8 px-4 print:p-0">
      <div className="max-w-3xl mx-auto space-y-6 print:max-w-none">
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold">INVOICE</h1>
            <p className="text-sm text-gray-600">Invoice #{invoice.invoice_number}</p>
          </div>
          <div className="text-right text-sm">
            <p><strong>Date:</strong> {formatDate(invoice.created_at)}</p>
            <p><strong>Due:</strong> {invoice.due_date || '—'}</p>
            <p><strong>Status:</strong> {invoice.status || 'draft'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div>
            <h2 className="font-semibold mb-2">Bill To</h2>
            <p>{invoice.client_name || '—'}</p>
            <p>{invoice.service_address || '—'}</p>
            <p>{invoice.client_email || '—'}</p>
            <p>{invoice.client_phone || '—'}</p>
          </div>
          <div>
            <h2 className="font-semibold mb-2">Invoice Details</h2>
            <p><strong>Title:</strong> {invoice.title || 'Services'}</p>
            <p><strong>Balance Due:</strong> {formatCurrency(invoice.balance_due || 0)}</p>
          </div>
        </div>

        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2">Description</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">Price</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.line_items || []).map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-2">{item.description}</td>
                <td className="py-2 text-right">{item.quantity}</td>
                <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2 text-right">{formatCurrency(calcLineItemTotal(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto max-w-sm space-y-1 text-sm text-right">
          <p>Subtotal: {formatCurrency(invoice.subtotal || 0)}</p>
          <p>Tax ({invoice.tax_rate || 0}%): {formatCurrency(invoice.tax_amount || 0)}</p>
          {(invoice.discount_amount || 0) > 0 && <p>Discount: -{formatCurrency(invoice.discount_amount)}</p>}
          <p className="text-xl font-bold border-t pt-2">Total: {formatCurrency(invoice.total_amount || 0)}</p>
          <p className="text-base font-semibold">Balance Due: {formatCurrency(invoice.balance_due || 0)}</p>
        </div>

        {invoice.notes && (
          <div>
            <h2 className="font-semibold mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
