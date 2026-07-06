import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader, Card, Table, Badge, EmptyState } from '../components/Shared'
import { formatDateTime } from '../store'
import { Mail, RefreshCw, ArrowRight, Check } from 'lucide-react'

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function Inbox() {
  const navigate = useNavigate()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const unreadCount = useMemo(() => emails.filter(e => e.status !== 'read').length, [emails])

  async function loadInbox() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/inbox')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to load inbox')
      setEmails(data.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id) {
    try {
      await fetch(`/api/inbox/${id}/read`, { method: 'PATCH' })
      setEmails(prev => prev.map(email => email.id === id ? { ...email, status: 'read' } : email))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadInbox()
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inbox"
        description={`${emails.length} messages · ${unreadCount} unread`}
        action={<button onClick={loadInbox} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800"><RefreshCw className="w-4 h-4" /> Refresh</button>}
      />

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading inbox…</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600">{error}</div>
        ) : emails.length === 0 ? (
          <EmptyState icon={Mail} title="No emails yet" description="Incoming Mailgun messages will appear here once the route is active." />
        ) : (
          <Table headers={['From', 'To', 'Subject', 'Preview', 'Date', 'Status', 'Actions']}>
            {emails.map(email => (
              <tr key={email.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{email.from_email || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{email.to_email || '—'}</td>
                <td className="px-4 py-3 font-medium">{email.subject || '(no subject)'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[420px] truncate">{stripHtml(email.body_text || email.body_html || '')}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(email.created)}</td>
                <td className="px-4 py-3"><Badge className={email.status === 'read' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>{email.status || 'unread'}</Badge></td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => markRead(email.id)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200">
                      <Check className="w-3 h-3" /> Read
                    </button>
                    <button onClick={() => navigate('/leads')} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200">
                      <ArrowRight className="w-3 h-3" /> Leads
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
