import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useData } from '../context'
import { formatCurrency, formatDate, calcLineItemTotal } from '../store'
import { Card, Button } from '../components/Shared'
import { CheckCircle, XCircle, FileText } from 'lucide-react'

export default function ClientPortal() {
  const { estimateId } = useParams()
  const { estimates, saveEstimates } = useData()
  const [actionTaken, setActionTaken] = useState(null)

  const estimate = estimateId ? estimates.find(e => e.id === estimateId) : null

  if (!estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Estimate Not Found</h2>
          <p className="text-gray-500">The estimate you're looking for could not be found. Please check your link or contact us.</p>
        </Card>
      </div>
    )
  }

  function handleApprove() {
    saveEstimates(estimates.map(e => e.id === estimate.id ? { ...e, status: 'approved' } : e))
    setActionTaken('approved')
  }

  function handleDecline() {
    saveEstimates(estimates.map(e => e.id === estimate.id ? { ...e, status: 'declined' } : e))
    setActionTaken('declined')
  }

  if (actionTaken === 'approved') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Estimate Approved!</h2>
          <p className="text-gray-500">Thank you! Your estimate has been approved and we'll be in touch shortly to schedule the work.</p>
        </Card>
      </div>
    )
  }

  if (actionTaken === 'declined') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Estimate Declined</h2>
          <p className="text-gray-500">You've declined this estimate. If you'd like to discuss options, please contact us.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Estimate {estimate.estimate_number}</h1>
          <p className="text-gray-500 mt-1">{estimate.title || estimate.service_type || 'Service Estimate'}</p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-500">Client:</span> <strong>{estimate.client_name || '—'}</strong></div>
            <div><span className="text-gray-500">Date:</span> <strong>{formatDate(estimate.created_at)}</strong></div>
            <div className="col-span-2"><span className="text-gray-500">Address:</span> <strong>{estimate.service_address || '—'}</strong></div>
          </div>
          {estimate.description && (
            <div className="text-sm"><span className="text-gray-500">Description:</span> <p className="mt-1">{estimate.description}</p></div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Notes</h3>
          <div className="bg-gray-50 rounded-lg p-4 text-sm whitespace-pre-wrap">{estimate.notes || '—'}</div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold mb-4">Estimate Details</h3>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-left py-2">Description</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Price</th><th className="text-right py-2">Total</th></tr></thead>
            <tbody>
              {(estimate.line_items || []).map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-2">{item.description}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 text-right font-medium">{formatCurrency(calcLineItemTotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-1 text-sm text-right">
            <p>Subtotal: {formatCurrency(estimate.subtotal)}</p>
            {(estimate.discount_amount || 0) > 0 && <p>Discount: -{formatCurrency(estimate.discount_amount)}</p>}
            <p className="text-xl font-bold">Total: {formatCurrency(estimate.total_amount)}</p>
          </div>
        </Card>

        {estimate.terms && (
          <Card className="p-4">
            <p className="text-sm text-gray-600">{estimate.terms}</p>
          </Card>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-blue-800 font-medium mb-4">Please review the estimate and then choose one of the buttons below</p>
          <div className="flex justify-center gap-4">
            <Button variant="success" onClick={handleApprove}><CheckCircle className="w-4 h-4 mr-1" /> Approve Estimate</Button>
            <Button variant="danger" onClick={handleDecline}><XCircle className="w-4 h-4 mr-1" /> Decline</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
