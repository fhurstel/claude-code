export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function generateNumber(prefix, items, field) {
  const max = items.reduce((m, item) => {
    const num = parseInt(item[field]?.replace(/[^0-9]/g, '') || '0')
    return num > m ? num : m
  }, 0)
  return `${prefix}-${String(max + 1).padStart(4, '0')}`
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

export function formatDate(date) {
  if (!date) return '—'
  try { return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '—' }
}

export function formatDateTime(date) {
  if (!date) return '—'
  try { return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) } catch { return '—' }
}

export function calcLineItemTotal(item) {
  return (item.quantity || item.qty || 0) * (item.unit_price || item.price || 0)
}

export function calcSubtotal(lineItems) {
  return (lineItems || []).reduce((sum, item) => sum + calcLineItemTotal(item), 0)
}

export function calcTax(lineItems, taxRate) {
  return calcSubtotal(lineItems) * ((taxRate || 0) / 100)
}

export function calcTotal(lineItems, taxRate, discount) {
  return calcSubtotal(lineItems) + calcTax(lineItems, taxRate) - (discount || 0)
}

export function calcEstimateTotal(lineItems, taxRate = 0, discount = 0) {
  const subtotal = calcSubtotal(lineItems)
  const tax = calcTax(lineItems, taxRate)
  return { subtotal, tax, total: subtotal + tax - discount }
}

export function getEstimateStatusColor(status) {
  const colors = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', approved: 'bg-green-100 text-green-700', declined: 'bg-red-100 text-red-700', converted: 'bg-purple-100 text-purple-700' }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getJobStatusColor(status) {
  const colors = { scheduled: 'bg-blue-100 text-blue-700', en_route: 'bg-indigo-100 text-indigo-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', on_hold: 'bg-orange-100 text-orange-700' }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getPriorityColor(priority) {
  const colors = { low: 'bg-gray-100 text-gray-700', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700', urgent: 'bg-red-100 text-red-700' }
  return colors[priority] || 'bg-gray-100 text-gray-700'
}

export function getInvoiceStatusColor(status) {
  const colors = { draft: 'bg-gray-100 text-gray-700', sent: 'bg-blue-100 text-blue-700', viewed: 'bg-cyan-100 text-cyan-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700', partial: 'bg-yellow-100 text-yellow-700', cancelled: 'bg-gray-100 text-gray-500' }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getLeadStatusColor(status) {
  const colors = { new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700', qualified: 'bg-green-100 text-green-700', client_created: 'bg-teal-100 text-teal-700', converted: 'bg-purple-100 text-purple-700', lost: 'bg-red-100 text-red-700' }
  return colors[status] || 'bg-gray-100 text-gray-700'
}
