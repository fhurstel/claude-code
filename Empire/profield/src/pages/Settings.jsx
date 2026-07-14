import { useState } from 'react'
import { useData } from '../context'
import { PageHeader, Card, Button, Input, Textarea } from '../components/Shared'
import { Save, Key } from 'lucide-react'

export default function Settings() {
  const { settings, saveSettings } = useData()
  const [form, setForm] = useState({ ...settings })
  const [saved, setSaved] = useState(false)

  function update(field, value) { setForm(prev => ({ ...prev, [field]: value })) }

  function handleSave() {
    saveSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your business settings" />
      
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold">Business Information</h3>
        <Input label="Business Name" value={form.businessName} onChange={e => update('businessName', e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Payment Terms" value={form.defaultPaymentTerms} onChange={e => update('defaultPaymentTerms', e.target.value)} />
        </div>
        <Textarea label="Default Estimate Terms" value={form.defaultEstimateTerms} onChange={e => update('defaultEstimateTerms', e.target.value)} rows={3} />
        <Textarea label="Default Invoice Notes" value={form.defaultInvoiceNotes} onChange={e => update('defaultInvoiceNotes', e.target.value)} rows={2} />
      </Card>

      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2"><Key className="w-4 h-4" /> API Key</h3>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-100 px-3 py-2 rounded-lg text-sm break-all">{form.apiKey}</code>
          <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(form.apiKey)}>Copy</Button>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave}><Save className="w-4 h-4" /> Save Settings</Button>
        {saved && <span className="text-sm text-green-600">✓ Saved!</span>}
      </div>
    </div>
  )
}
