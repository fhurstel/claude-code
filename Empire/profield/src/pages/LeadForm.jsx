import { useState } from 'react'
import { useData } from '../context'
import { generateId } from '../store'
import { Card, Button, FormField, Input, Textarea } from '../components/Shared'
import { CheckCircle, FileText } from 'lucide-react'

export default function LeadForm() {
  const { leads, saveLeads } = useData()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', service_needed: '', message: '',
  })

  function updateField(key, value) { setForm({ ...form, [key]: value }) }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    const newLead = {
      id: generateId(),
      ...form,
      status: 'new',
      source: 'web_form',
      created_at: new Date().toISOString(),
    }
    saveLeads([...leads, newLead])
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-gray-500">Your request has been received. We'll get back to you within 24 hours.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold">Request a Free Estimate</h1>
          <p className="text-gray-500 mt-1">Fill out the form below and we'll get back to you shortly.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Full Name *">
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="John Smith" required />
            </FormField>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Email">
                <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="john@example.com" />
              </FormField>
              <FormField label="Phone">
                <Input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(555) 123-4567" />
              </FormField>
            </div>
            <FormField label="Service Address">
              <Input value={form.address} onChange={e => updateField('address', e.target.value)} placeholder="123 Main St, City, State" />
            </FormField>
            <FormField label="Service Needed">
              <Input value={form.service_needed} onChange={e => updateField('service_needed', e.target.value)} placeholder="e.g. HVAC repair, plumbing, electrical" />
            </FormField>
            <FormField label="Additional Details">
              <Textarea value={form.message} onChange={e => updateField('message', e.target.value)} rows={4} placeholder="Describe the issue or what you need..." />
            </FormField>
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
