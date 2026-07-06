import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../context'
import { formatCurrency, formatDate, calcLineItemTotal, calcSubtotal, generateNumber, generateId, getEstimateStatusColor } from '../store'
import { PageHeader, Card, Button, FormField, Input, Select, Textarea, Modal } from '../components/Shared'
import { ArrowLeft, Trash2, Plus, Save, Mail, CheckCircle, XCircle, FileText, Send, UserPlus, Loader, Copy, MessageSquareText } from 'lucide-react'
import { sendEstimateEmail } from '../services/mailgun'

const emptyLineItem = () => ({ id: generateId(), description: '', quantity: 1, unit_price: '', total: 0 })

export default function EstimateDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { estimates, clients, serviceTypes, saveEstimates, saveJobs, saveInvoices, jobs, invoices, saveClients, getData } = useData()
  const isNew = !id || id === 'new'
  const estimate = isNew ? null : estimates.find(e => e.id === id)

  const [form, setForm] = useState(() => ({
    id: generateId(), estimate_number: generateNumber('EST', estimates, 'estimate_number'),
    client_id: '', client_name: '', client_email: '', client_phone: '',
    service_address: '', service_type: '', title: '', description: '',
    line_items: [emptyLineItem()], discount_amount: 0,
    status: 'draft', notes: '', terms: 'This estimate is valid for 30 days.',
    subtotal: 0, total_amount: 0, created_at: new Date().toISOString(),
  }))

  const [emailModal, setEmailModal] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [emailCC, setEmailCC] = useState('')
  const [emailBCC, setEmailBCC] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', address: '' })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [replyModal, setReplyModal] = useState(false)

  const formRef = useRef(form)
  const initializedRef = useRef(false)

  const setFormAndRef = (updater) => {
    const base = formRef.current ?? form
    const next = typeof updater === 'function' ? updater(base) : updater
    formRef.current = next
    setForm(next)
    return next
  }

  const recalcTotals = (f) => {
    const st = calcSubtotal(f.line_items)
    const total_amount = st - (f.discount_amount || 0)
    return { ...f, subtotal: st, total_amount }
  }

  // Load existing estimate OR pre-fill from URL params (lead conversion)
  useEffect(() => {
    if (initializedRef.current) return

    if (estimate && !isNew) {
      initializedRef.current = true
      const f = { ...estimate }
      if (!f.line_items || f.line_items.length === 0) f.line_items = [emptyLineItem()]
      // Ensure all fields exist
      f.client_email = f.client_email || ''
      f.client_phone = f.client_phone || ''
      f.service_address = f.service_address || ''
      f.service_type = f.service_type || ''
      f.notes = f.notes || ''
      f.terms = f.terms || 'This estimate is valid for 30 days.'
      f.discount_amount = f.discount_amount || 0
      const recalced = recalcTotals(f)
      setFormAndRef(recalced)
      setEmailSent(f.status === 'sent' || f.status === 'approved' || f.status === 'declined')
    } else if (isNew) {
      // Check for URL params from lead conversion
      const leadData = {}
      const fields = ['client_name', 'client_email', 'client_phone', 'service_address', 'title', 'description', 'service_type']
      let hasLeadData = false
      fields.forEach(field => {
        const val = searchParams.get(field)
        if (val) {
          leadData[field] = val
          hasLeadData = true
        }
      })
      if (hasLeadData) {
        initializedRef.current = true
        setFormAndRef(prev => recalcTotals({ ...prev, ...leadData }))
      }
    }
  }, [estimate, isNew, searchParams])

  function updateField(key, value) {
    setFormAndRef(prev => recalcTotals({ ...prev, [key]: value }))
  }

  function updateLineItem(idx, key, value) {
    setFormAndRef(prev => {
      const items = [...(prev.line_items || [])]
      items[idx] = { ...items[idx], [key]: value }
      items[idx].total = calcLineItemTotal(items[idx])
      return recalcTotals({ ...prev, line_items: items })
    })
  }

  function updateLineItemPrice(idx, key, rawValue) {
    // Store raw string during editing, parse to number for calculations
    setFormAndRef(prev => {
      const items = [...(prev.line_items || [])]
      const numValue = rawValue === '' ? 0 : parseFloat(rawValue)
      items[idx] = { ...items[idx], [key]: isNaN(numValue) ? 0 : numValue, [`${key}_raw`]: rawValue }
      items[idx].total = calcLineItemTotal(items[idx])
      return recalcTotals({ ...prev, line_items: items })
    })
  }

  function getLineItemDisplayValue(item, key) {
    // Show raw string if it exists, otherwise show the numeric value (or empty if 0)
    const rawKey = `${key}_raw`
    if (item[rawKey] !== undefined && item[rawKey] !== '') return item[rawKey]
    const val = item[key]
    if (val === 0 || val === '0' || val === '' || val == null) return ''
    return val
  }

  function addLineItem() {
    setFormAndRef(prev => recalcTotals({ ...prev, line_items: [...(prev.line_items || []), emptyLineItem()] }))
  }

  function removeLineItem(idx) {
    setFormAndRef(prev => recalcTotals({ ...prev, line_items: (prev.line_items || []).filter((_, i) => i !== idx) }))
  }

  async function handleSave() {
    const recalced = recalcTotals(formRef.current)
    const formData = { ...recalced, line_items: recalced.line_items.map(item => {
      const unitPriceSource = item.unit_price_raw ?? item.unit_price
      const quantitySource = item.quantity_raw ?? item.quantity
      return {
        id: item.id,
        description: item.description || '',
        quantity: parseFloat(quantitySource) || 0,
        unit_price: parseFloat(unitPriceSource) || 0,
        total: calcLineItemTotal({ ...item, quantity: quantitySource, unit_price: unitPriceSource }),
      }
    }) }
    const current = getData()
    const currentEstimates = current.estimates || []
    if (isNew) {
      await saveEstimates([...currentEstimates, formData])
    } else {
      await saveEstimates(currentEstimates.map(e => e.id === formData.id ? formData : e))
    }
    setFormAndRef(formData)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  async function handleSaveAndClose() {
    await handleSave()
    navigate('/estimates')
  }

  function handleAddClient() {
    if (!newClient.full_name.trim()) return
    const client = { id: generateId(), full_name: newClient.full_name, email: newClient.email, phone: newClient.phone, address: newClient.address, created_at: new Date().toISOString() }
    const dc = getData()
    saveClients([...(dc.clients||[]), client])
    updateField('client_id', client.id)
    updateField('client_name', client.full_name)
    updateField('client_email', client.email || '')
    updateField('client_phone', client.phone || '')
    setShowAddClient(false)
    setNewClient({ full_name: '', email: '', phone: '', address: '' })
  }

  function openEmailModal() {
    // Always recalculate totals from current line items before emailing
    const current = formRef.current
    const recalced = recalcTotals(current)
    setFormAndRef(recalced)

    setEmailTo(recalced.client_email || '')
    setEmailCC('')
    setEmailBCC('')
    setEmailSubject(`Estimate #${recalced.estimate_number} — ${recalced.title || recalced.service_type || 'Services'}`)
    setEmailBody(`Dear ${recalced.client_name || 'Client'},\n\nPlease find your estimate for ${recalced.title || recalced.service_type || 'services'} below.\n\nTotal: ${formatCurrency(recalced.total_amount)}\n\n${recalced.terms}\n\nPlease reply to approve or decline this estimate.\n\nThank you!`)
    setEmailError('')
    setEmailSuccess(false)
    setEmailSent(recalced.status === 'sent' || recalced.status === 'approved' || recalced.status === 'declined')
    setEmailModal(true)
  }

  async function handleSendEmail() {
    // Use recalculated data for email
    const recalced = recalcTotals(formRef.current)
    const f = { ...recalced, client_email: emailTo, cc: emailCC, bcc: emailBCC }
    setSendingEmail(true)
    setEmailError('')
    setEmailSuccess(false)
    const result = await sendEstimateEmail(f, emailSubject, emailBody)
    if (result.success) {
      const updated = { ...recalced, client_email: emailTo, status: 'sent', email_message_id: result.id }
      setFormAndRef(updated)
      const d1 = getData()
      if (isNew) saveEstimates([...(d1.estimates||[]), updated])
      else saveEstimates((d1.estimates||[]).map(e => e.id === updated.id ? updated : e))
      setEmailSent(true)
      setEmailSuccess(true)
    } else {
      setEmailError(result.message)
      if (emailTo) {
        const params = new URLSearchParams({ subject: emailSubject, body: emailBody })
        if (emailCC) params.set('cc', emailCC)
        if (emailBCC) params.set('bcc', emailBCC)
        window.open(`mailto:${emailTo}?${params.toString()}`, '_blank')
      }
    }
    setSendingEmail(false)
  }

  function handleClientApprove() {
    const updated = { ...formRef.current, status: 'approved' }
    setFormAndRef(updated)
    const da = getData()
    saveEstimates((da.estimates||[]).map(e => e.id === updated.id ? updated : e))
  }

  function handleClientDecline() {
    const updated = { ...formRef.current, status: 'declined' }
    setFormAndRef(updated)
    const dd = getData()
    saveEstimates((dd.estimates||[]).map(e => e.id === updated.id ? updated : e))
  }

  function getQuickReplyDraft() {
    const leadName = formRef.current.client_name || 'there'
    const service = formRef.current.title || formRef.current.service_type || 'your estimate'
    const estimateId = encodeURIComponent(formRef.current.id || '')
    const sms = `Hi ${leadName}, thanks for reaching out to Aqua Logic Plumbing. Your estimate for ${service} is ready: ${window.location.origin}/portal/${estimateId}. You can view the full details there and tap Approve or Decline.`
    const email = `Hi ${leadName},\n\nThanks for reaching out to Aqua Logic Plumbing. Your estimate for ${service} is ready.\n\nPlease review the details in the portal and use the buttons to approve or decline.\n\nThank you!`
    return { sms, email }

  }

  async function copyText(text) {
    await navigator.clipboard.writeText(text)
  }

  function handleConvertToJob() {
    const f = formRef.current
    const current = getData()
    
    // Ensure client exists — create from estimate data if needed
    let clientId = f.client_id
    if (!clientId && f.client_name) {
      const existingClient = current.clients?.find(c => 
        c.full_name?.toLowerCase() === f.client_name?.toLowerCase() ||
        c.email === f.client_email ||
        c.phone === f.client_phone
      )
      if (existingClient) {
        clientId = existingClient.id
      } else {
        const newClient = {
          id: generateId(),
          full_name: f.client_name,
          email: f.client_email || '',
          phone: f.client_phone || '',
          address: f.service_address || '',
          created_at: new Date().toISOString(),
        }
        saveClients([...(current.clients || []), newClient])
        clientId = newClient.id
      }
    }

    const cleanLineItems = (f.line_items || []).map(item => ({
      id: item.id || generateId(),
      description: item.description || '',
      quantity: item.quantity || item.qty || 1,
      unit_price: item.unit_price || item.price || 0,
      total: calcLineItemTotal(item),
    }))
    const st = calcSubtotal(cleanLineItems)
    const totalAmt = st - (f.discount_amount || 0)
    const job = {
      id: generateId(), job_number: generateNumber('JOB', jobs, 'job_number'),
      client_id: clientId, client_name: f.client_name || '',
      client_email: f.client_email || '', client_phone: f.client_phone || '',
      title: f.title || '', description: f.description || '',
      address: f.service_address || '', service_address: f.service_address || '',
      service_type: f.service_type || '', line_items: cleanLineItems,
      preferred_date: f.preferred_date || '', scheduled_date: f.preferred_date || '',
      tax_rate: 0, discount_amount: f.discount_amount || 0,
      subtotal: st, tax_amount: 0, total_amount: totalAmt,
      estimate_id: f.id,
      status: 'scheduled',
      priority: 'normal',
      technician: '',
      completion_notes: '',
      updates: [],
      created_at: new Date().toISOString(),
    }
    const newJobs = [...(current.jobs || []), job]
    saveJobs(newJobs)
    const updatedEst = { ...f, status: 'converted' }
    setFormAndRef(updatedEst)
    saveEstimates((current.estimates||[]).map(e => e.id === f.id ? updatedEst : e))
    navigate(`/jobs/${job.id}`)
  }

  function handleConvertToInvoice() {
    const f = formRef.current
    // Clean line items — ensure all fields are properly set
    const cleanLineItems = (f.line_items || []).map(item => ({
      id: item.id || generateId(),
      description: item.description || '',
      quantity: item.quantity || item.qty || 1,
      unit_price: item.unit_price || item.price || 0,
      total: calcLineItemTotal(item),
    }))
    const st = calcSubtotal(cleanLineItems)
    const totalAmt = st - (f.discount_amount || 0)
    const inv = {
      id: generateId(), invoice_number: generateNumber('INV', invoices, 'invoice_number'),
      client_id: f.client_id, client_name: f.client_name || '',
      client_email: f.client_email || '', client_phone: f.client_phone || '',
      title: f.title || '', service_address: f.service_address || '',
      line_items: cleanLineItems,
      tax_rate: f.tax_rate || 0, discount_amount: f.discount_amount || 0,
      subtotal: st, tax_amount: taxAmt, total_amount: totalAmt,
      amount_paid: 0, balance_due: totalAmt,
      status: 'draft', due_date: '', notes: f.terms || f.notes || '',
      estimate_id: f.id, job_id: '',
      created_at: new Date().toISOString(),
    }
    const current = getData()
    saveInvoices([...(current.invoices||[]), inv])
    const updatedEst = { ...f, status: 'converted' }
    setFormAndRef(updatedEst)
    saveEstimates((current.estimates||[]).map(e => e.id === f.id ? updatedEst : e))
    navigate(`/invoices/${inv.id}`)
  }

  if (!form) return <div className="p-8 text-center text-gray-500">Loading...</div>

  // Recalculate display totals from current line items
  const displaySubtotal = calcSubtotal(form.line_items)
  const displayTotal = displaySubtotal - (form.discount_amount || 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title={isNew ? 'New Estimate' : `Estimate ${form.estimate_number}`}
        description={form.title || 'Create a new estimate'}
        action={<Button variant="ghost" onClick={() => navigate('/estimates')}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>}
      />

      {/* Top action bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {saveSuccess && (
          <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
            <CheckCircle className="w-4 h-4" /> Saved successfully!
          </span>
        )}
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {isNew ? 'Create Estimate' : 'Save'}</Button>
        <Button variant="outline" onClick={handleSaveAndClose}><ArrowLeft className="w-4 h-4 mr-1" /> Save & Close</Button>
        {!isNew && (
          <Button variant="outline" onClick={() => setReplyModal(true)}>
            <MessageSquareText className="w-4 h-4 mr-1" />
            Text Client
          </Button>
        )}
        {!isNew && (
          <Button variant="outline" onClick={openEmailModal}>
            <Mail className="w-4 h-4 mr-1" />
            {emailSent ? 'Resend Email' : 'Email to Client'}
          </Button>
        )}
        {form.status === 'sent' && (
          <>
            <Button variant="outline" onClick={handleClientApprove} className="text-green-600 border-green-300 hover:bg-green-50">
              <CheckCircle className="w-4 h-4 mr-1" /> Mark Approved
            </Button>
            <Button variant="outline" onClick={handleClientDecline} className="text-red-600 border-red-300 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-1" /> Mark Declined
            </Button>
          </>
        )}
        {form.status === 'approved' && (
          <>
            <Button onClick={handleConvertToJob}><Plus className="w-4 h-4 mr-1" /> Create Job</Button>
            <Button variant="outline" onClick={handleConvertToInvoice}><FileText className="w-4 h-4 mr-1" /> Create Invoice</Button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Client Information</h3>
            <FormField label="Client">
              <div className="flex gap-2">
                <Select value={form.client_id || ''} onChange={e => {
                  const client = clients.find(c => c.id === e.target.value)
                  updateField('client_id', e.target.value)
                  if (client) {
                    updateField('client_name', client.full_name || '')
                    updateField('client_email', client.email || '')
                    updateField('client_phone', client.phone || '')
                    if (!form.service_address) updateField('service_address', client.address || '')
                  }
                }} className="flex-1">
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowAddClient(true)}><UserPlus className="w-4 h-4" /></Button>
              </div>
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Client Name"><Input value={form.client_name || ''} onChange={e => updateField('client_name', e.target.value)} /></FormField>
              <FormField label="Client Email"><Input type="email" value={form.client_email || ''} onChange={e => updateField('client_email', e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Client Phone"><Input value={form.client_phone || ''} onChange={e => updateField('client_phone', e.target.value)} /></FormField>
              <FormField label="Service Address"><Input value={form.service_address || ''} onChange={e => updateField('service_address', e.target.value)} /></FormField>
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Estimate Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Title"><Input value={form.title || ''} onChange={e => updateField('title', e.target.value)} placeholder="Estimate title" /></FormField>
              <FormField label="Service Type"><Input value={form.service_type || ''} onChange={e => updateField('service_type', e.target.value)} placeholder="e.g. HVAC Repair" /></FormField>
            </div>
            <FormField label="Description"><Textarea value={form.description || ''} onChange={e => updateField('description', e.target.value)} rows={2} /></FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Status">
                <Select value={form.status || 'draft'} onChange={e => updateField('status', e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="approved">Approved</option>
                  <option value="declined">Declined</option>
                  <option value="converted">Converted</option>
                </Select>
              </FormField>
            </div>
            <FormField label="Notes"><Textarea value={form.notes || ''} onChange={e => updateField('notes', e.target.value)} rows={2} /></FormField>
            <FormField label="Terms"><Textarea value={form.terms || ''} onChange={e => updateField('terms', e.target.value)} rows={2} /></FormField>
          </Card>

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Line Items</h3>
              <Button size="sm" variant="outline" onClick={addLineItem}><Plus className="w-3 h-3 mr-1" /> Add Item</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2 w-20">Qty</th>
                    <th className="text-left py-2 w-28">Unit Price</th>
                    <th className="text-left py-2 w-24">Total</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {(form.line_items || []).length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-center text-gray-400 text-sm">No line items — click Add Item</td></tr>
                  ) : (form.line_items || []).map((item, idx) => (
                     <tr key={item.id || idx} className="border-b border-gray-100">
                      <td className="py-2"><input className="w-full px-2 py-1.5 border rounded-lg text-sm" value={item.description || ''} onChange={e => updateLineItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                      <td className="py-2"><input type="number" min="0" className="w-full px-2 py-1.5 border rounded-lg text-sm" value={getLineItemDisplayValue(item, 'quantity')} onChange={e => updateLineItemPrice(idx, 'quantity', e.target.value)} onBlur={() => setFormAndRef(prev => { const items = [...prev.line_items]; if (items[idx]) delete items[idx]['quantity_raw']; return { ...prev, line_items: items }; })} /></td>
                      <td className="py-2"><input type="number" min="0" step="0.01" className="w-full px-2 py-1.5 border rounded-lg text-sm" value={getLineItemDisplayValue(item, 'unit_price')} onChange={e => updateLineItemPrice(idx, 'unit_price', e.target.value)} onBlur={() => setFormAndRef(prev => { const items = [...prev.line_items]; if (items[idx]) delete items[idx]['unit_price_raw']; return { ...prev, line_items: items }; })} /></td>
                       <td className="py-2 font-medium">{formatCurrency(calcLineItemTotal(item))}</td>
                      <td className="py-2"><button onClick={() => removeLineItem(idx)} className="text-red-500 hover:text-red-700 active:text-red-900 p-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"><Trash2 className="w-4 h-4" /></button></td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Summary</h3>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal:</span><span>{formatCurrency(displaySubtotal)}</span></div>
            {form.discount_amount > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Discount:</span><span>-{formatCurrency(form.discount_amount)}</span></div>}
            <div className="flex justify-between font-bold border-t pt-2"><span>Total:</span><span>{formatCurrency(displayTotal)}</span></div>
          </Card>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-20 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between bg-gray-50/95 backdrop-blur border border-gray-200 rounded-xl p-3 sm:p-4">
        <Button variant="ghost" onClick={() => navigate('/estimates')}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:items-center">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4" /> Saved successfully!
            </span>
          )}
          <Button className="w-full sm:w-auto" onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {isNew ? 'Create Estimate' : 'Save'}</Button>
          <Button className="w-full sm:w-auto" variant="outline" onClick={handleSaveAndClose}><ArrowLeft className="w-4 h-4 mr-1" /> Save & Close</Button>
          {!isNew && (
            <Button className="w-full sm:w-auto" variant="outline" onClick={openEmailModal}>
              <Mail className="w-4 h-4 mr-1" />
              {emailSent ? 'Resend Email' : 'Email to Client'}
            </Button>
          )}
          {form.status === 'approved' && (
            <>
              <Button className="w-full sm:w-auto" onClick={handleConvertToJob}><Plus className="w-4 h-4 mr-1" /> Create Job</Button>
              <Button className="w-full sm:w-auto" variant="outline" onClick={handleConvertToInvoice}><FileText className="w-4 h-4 mr-1" /> Create Invoice</Button>
            </>
          )}
        </div>
      </div>

      <Modal open={replyModal} onClose={() => setReplyModal(false)} title={`Text Client — ${form.estimate_number}`} wide>
        <div className="space-y-4">
          {(() => {
            const tpl = getQuickReplyDraft()
            return (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">SMS draft</div>
                  <Textarea readOnly value={tpl.sms} rows={4} />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => copyText(tpl.sms)}><Copy className="w-4 h-4 mr-1" /> Copy SMS</Button>
                    <Button variant="outline" onClick={() => copyText(`${window.location.origin}/portal/${encodeURIComponent(formRef.current.id || '')}`)}><CheckCircle className="w-4 h-4 mr-1" /> Copy Portal Link</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-700">Email</div>
                  <Textarea readOnly value={tpl.email} rows={7} />
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                  Approval link: <span className="font-mono break-all">{tpl.approveUrl}</span><br/>
                  Decline link: <span className="font-mono break-all">{tpl.declineUrl}</span>
                </div>
              </>
            )
          })()}
        </div>
      </Modal>

      {/* Email Modal */}
      <Modal open={emailModal} onClose={() => setEmailModal(false)} title={`Email to Client — ${form.estimate_number}`} wide>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium">Edit recipients and message before sending</p>
          </div>
          {emailError && <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{emailError}</div>}
          {emailSuccess && <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg p-3 text-sm">Email sent successfully!</div>}
          <FormField label="To"><Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="client@example.com" /></FormField>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CC"><Input value={emailCC} onChange={e => setEmailCC(e.target.value)} placeholder="Optional CC" /></FormField>
            <FormField label="BCC"><Input value={emailBCC} onChange={e => setEmailBCC(e.target.value)} placeholder="Optional BCC" /></FormField>
          </div>
          <FormField label="Subject"><Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} /></FormField>
          <FormField label="Message"><Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8} /></FormField>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-2">Estimate Summary:</p>
            <p><strong>{form.title || form.service_type || 'Services'}</strong></p>
            <p>Total: {formatCurrency(displayTotal)}</p>
            <p className="text-gray-500 mt-1">{form.terms}</p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sticky bottom-0 bg-white pt-2">
            {emailSuccess ? (
              <Button className="w-full sm:w-auto" onClick={() => { setEmailModal(false); setEmailSuccess(false); }}>Close</Button>
            ) : (
              <>
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => setEmailModal(false)} disabled={sendingEmail}>Cancel</Button>
                <Button className="w-full sm:w-auto" onClick={handleSendEmail} disabled={sendingEmail || !emailTo}>
                  {sendingEmail ? <Loader className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
                  {sendingEmail ? 'Sending...' : emailSent ? 'Send Again' : 'Send Email'}
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>

      {/* Add Client Modal */}
      <Modal open={showAddClient} onClose={() => setShowAddClient(false)} title="Add New Client">
        <div className="space-y-4">
          <FormField label="Full Name *"><Input value={newClient.full_name} onChange={e => setNewClient({ ...newClient, full_name: e.target.value })} placeholder="John Doe" /></FormField>
          <FormField label="Email"><Input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="john@example.com" /></FormField>
          <FormField label="Phone"><Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="(555) 123-4567" /></FormField>
          <FormField label="Address"><Input value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} placeholder="123 Main St" /></FormField>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddClient(false)}>Cancel</Button>
            <Button onClick={handleAddClient}><UserPlus className="w-4 h-4 mr-1" /> Add Client</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
