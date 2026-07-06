import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context'
import { formatCurrency, formatDate, getJobStatusColor, getPriorityColor, generateId, generateNumber } from '../store'
import { PageHeader, Card, Button, Table, StatTabs, EmptyState, Modal, FormField, Input, Select, Textarea } from '../components/Shared'
import { Plus, Search, Briefcase, Trash2, Edit, UserPlus } from 'lucide-react'

export default function Jobs() {
  const { jobs, clients, estimates, saveJobs, getData, saveClients } = useData()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [newJobModal, setNewJobModal] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', address: '' })
  const [newJobForm, setNewJobForm] = useState({
    title: '', client_id: '', client_name: '', client_email: '', client_phone: '',
    service_type: '', service_address: '', description: '', notes: '',
    priority: 'normal', scheduled_start: '', scheduled_end: '', technician: '',
  })

  const filtered = [...jobs]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .filter(j => {
      if (filter !== 'all' && j.status !== filter) return false
      if (search && !j.job_number?.toLowerCase().includes(search.toLowerCase()) &&
          !j.client_name?.toLowerCase().includes(search.toLowerCase()) &&
          !j.title?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

  const tabs = [
    { value: 'all', label: 'All', count: jobs.length },
    { value: 'scheduled', label: 'Scheduled', count: jobs.filter(j => j.status === 'scheduled').length },
    { value: 'en_route', label: 'En Route', count: jobs.filter(j => j.status === 'en_route').length },
    { value: 'in_progress', label: 'In Progress', count: jobs.filter(j => j.status === 'in_progress').length },
    { value: 'completed', label: 'Completed', count: jobs.filter(j => j.status === 'completed').length },
    { value: 'cancelled', label: 'Cancelled', count: jobs.filter(j => j.status === 'cancelled').length },
    { value: 'on_hold', label: 'On Hold', count: jobs.filter(j => j.status === 'on_hold').length },
  ]

  function handleDelete(id) {
    if (!confirm('Delete this job?')) return
    const current = getData()
    saveJobs((current.jobs || []).filter(j => j.id !== id))
  }

  function handleNewJobField(key, value) {
    setNewJobForm(prev => {
      const updated = { ...prev, [key]: value }
      // When client is selected, auto-fill client details
      if (key === 'client_id' && value) {
        const client = clients.find(c => c.id === value)
        if (client) {
          updated.client_name = client.full_name || ''
          updated.client_email = client.email || ''
          updated.client_phone = client.phone || ''
          updated.service_address = client.address || ''
        }
      }
      return updated
    })
  }

  function handleAddClient() {
    if (!newClient.full_name.trim()) return
    const client = {
      id: generateId(),
      full_name: newClient.full_name,
      email: newClient.email,
      phone: newClient.phone,
      address: newClient.address,
      created_at: new Date().toISOString(),
    }
    const dc = getData()
    saveClients([...(dc.clients || []), client])
    handleNewJobField('client_id', client.id)
    setShowAddClient(false)
    setNewClient({ full_name: '', email: '', phone: '', address: '' })
  }

  function handleCreateJob() {
    if (!newJobForm.title.trim()) return
    const job = {
      id: generateId(),
      job_number: generateNumber('JOB', jobs, 'job_number'),
      title: newJobForm.title,
      client_id: newJobForm.client_id,
      client_name: newJobForm.client_name,
      client_email: newJobForm.client_email,
      client_phone: newJobForm.client_phone,
      estimate_id: '',
      service_type: newJobForm.service_type,
      service_address: newJobForm.service_address,
      description: newJobForm.description,
      notes: newJobForm.notes,
      status: 'scheduled',
      priority: newJobForm.priority,
      completion_notes: '',
      invoiced: false,
      scheduled_start: newJobForm.scheduled_start,
      scheduled_end: newJobForm.scheduled_end,
      scheduled_date: newJobForm.scheduled_start ? newJobForm.scheduled_start.split('T')[0] : '',
      technician: newJobForm.technician,
      updates: [],
      created_at: new Date().toISOString(),
    }
    const current = getData()
    const newList = [...(current.jobs || []), job]
    saveJobs(newList)
    setNewJobModal(false)
    setNewJobForm({
      title: '', client_id: '', client_name: '', client_email: '', client_phone: '',
      service_type: '', service_address: '', description: '', notes: '',
      priority: 'normal', scheduled_start: '', scheduled_end: '', technician: '',
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jobs"
        description={`${jobs.length} total jobs`}
        action={
          <Button onClick={() => setNewJobModal(true)}><Plus className="w-4 h-4 mr-1" /> New Job</Button>
        }
      />
      <div className="flex flex-col sm:flex-row gap-3">
        <StatTabs tabs={tabs} active={filter} onChange={setFilter} />
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent w-full sm:w-64" />
        </div>
      </div>
      <Card>
        {filtered.length === 0 ? (
          <EmptyState icon={Briefcase} title="No jobs found" description="Create a new job or convert an approved estimate." action={<Button onClick={() => setNewJobModal(true)}><Plus className="w-4 h-4 mr-1" /> New Job</Button>} />
        ) : (
          <Table headers={['#', 'Title', 'Client', 'Service Address', 'Scheduled', 'Technician', 'Priority', 'Status', 'Actions']}>
            {filtered.map(j => (
              <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium"><Link to={`/jobs/${j.id}`} className="text-accent hover:underline">{j.job_number}</Link></td>
                <td className="py-3 px-4">{j.title || '—'}</td>
                <td className="py-3 px-4">{j.client_name || '—'}</td>
                <td className="py-3 px-4 text-xs text-gray-500">{j.service_address || '—'}</td>
                <td className="py-3 px-4 text-xs">{j.scheduled_start ? formatDate(j.scheduled_start) : '—'}</td>
                <td className="py-3 px-4 text-xs">{j.technician || '—'}</td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(j.priority)}`}>{j.priority}</span></td>
                <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(j.status)}`}>{j.status?.replace(/_/g, ' ')}</span></td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <Link to={`/jobs/${j.id}`} className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1"><Edit className="w-3 h-3" /> Edit</Link>
                    <button onClick={() => handleDelete(j.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {/* New Job Modal */}
      <Modal open={newJobModal} onClose={() => setNewJobModal(false)} title="Create New Job" wide>
        <div className="space-y-4">
          <FormField label="Title *">
            <Input value={newJobForm.title} onChange={e => handleNewJobField('title', e.target.value)} placeholder="Job title" />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Client">
              <div className="flex gap-2">
                <Select value={newJobForm.client_id} onChange={e => handleNewJobField('client_id', e.target.value)} className="flex-1">
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </Select>
                <Button variant="outline" size="sm" onClick={() => setShowAddClient(true)} title="Add new client">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>
            </FormField>
            <FormField label="Service Type">
              <Input value={newJobForm.service_type} onChange={e => handleNewJobField('service_type', e.target.value)} placeholder="e.g. HVAC Repair" />
            </FormField>
          </div>

          <FormField label="Service Address">
            <Input value={newJobForm.service_address} onChange={e => handleNewJobField('service_address', e.target.value)} placeholder="123 Main St" />
          </FormField>

          <FormField label="Description">
            <Textarea value={newJobForm.description} onChange={e => handleNewJobField('description', e.target.value)} rows={2} placeholder="Job description..." />
          </FormField>

          <FormField label="Notes">
            <Textarea value={newJobForm.notes} onChange={e => handleNewJobField('notes', e.target.value)} rows={2} placeholder="Internal notes..." />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Scheduled Start">
              <Input type="datetime-local" value={newJobForm.scheduled_start} onChange={e => handleNewJobField('scheduled_start', e.target.value)} />
            </FormField>
            <FormField label="Scheduled End">
              <Input type="datetime-local" value={newJobForm.scheduled_end} onChange={e => handleNewJobField('scheduled_end', e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Priority">
              <Select value={newJobForm.priority} onChange={e => handleNewJobField('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </FormField>
            <FormField label="Technician">
              <Input value={newJobForm.technician} onChange={e => handleNewJobField('technician', e.target.value)} placeholder="Assign tech..." />
            </FormField>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sticky bottom-0 bg-white pt-2">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setNewJobModal(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleCreateJob}><Plus className="w-4 h-4 mr-1" /> Create Job</Button>
          </div>
        </div>
      </Modal>

      {/* Add Client Modal */}
      <Modal open={showAddClient} onClose={() => setShowAddClient(false)} title="Add New Client">
        <div className="space-y-4">
          <FormField label="Full Name *">
            <Input value={newClient.full_name} onChange={e => setNewClient({ ...newClient, full_name: e.target.value })} placeholder="John Doe" />
          </FormField>
          <FormField label="Email">
            <Input type="email" value={newClient.email} onChange={e => setNewClient({ ...newClient, email: e.target.value })} placeholder="john@example.com" />
          </FormField>
          <FormField label="Phone">
            <Input value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="(555) 123-4567" />
          </FormField>
          <FormField label="Address">
            <Input value={newClient.address} onChange={e => setNewClient({ ...newClient, address: e.target.value })} placeholder="123 Main St" />
          </FormField>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sticky bottom-0 bg-white pt-2">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowAddClient(false)}>Cancel</Button>
            <Button className="w-full sm:w-auto" onClick={handleAddClient}><UserPlus className="w-4 h-4 mr-1" /> Add Client</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
