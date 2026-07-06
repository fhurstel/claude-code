import { useState, useRef, useMemo, useCallback } from 'react'
import { useData } from '../context'
import { useNavigate } from 'react-router-dom'
import { Card, PageHeader, Badge, Button } from '../components/Shared'
import {
  format, startOfWeek, addDays, isSameDay, parseISO, startOfDay,
  setHours, setMinutes,
} from 'date-fns'
import {
  ChevronLeft, ChevronRight, Calendar, List, Filter,
  Clock, MapPin, User, Wrench, Square, CheckSquare, ExternalLink,
} from 'lucide-react'

const JOB_STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'en_route', label: 'En Route' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
]

const STATUS_COLORS = {
  scheduled:    { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200',   dot: 'bg-blue-500' },
  en_route:     { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  in_progress:  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', dot: 'bg-yellow-500' },
  completed:    { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200',  dot: 'bg-green-500' },
  on_hold:      { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
  cancelled:    { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-200',    dot: 'bg-red-500' },
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6) // 6 AM – 6 PM

export default function Schedule() {
  const { jobs, saveJobs, clients } = useData()
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()))
  const [view, setView] = useState('calendar')
  const [statusFilter, setStatusFilter] = useState([])
  const [selectedJobs, setSelectedJobs] = useState([])
  const [dragJob, setDragJob] = useState(null)
  const [dragOverSlot, setDragOverSlot] = useState(null)
  const dragOverSlotRef = useRef(null)

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const filteredJobs = useMemo(() => {
    if (statusFilter.length === 0) return jobs
    return jobs.filter(j => statusFilter.includes(j.status))
  }, [jobs, statusFilter])

  function toggleStatusFilter(status) {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  // Robust date extraction from job
  function getJobDate(job) {
    const dateStr = job.scheduled_start || job.scheduled_date
    if (!dateStr) return null
    try {
      const d = parseISO(dateStr)
      if (isNaN(d.getTime())) return null
      return d
    } catch { return null }
  }

  function getJobsForDay(day) {
    return filteredJobs.filter(j => {
      const d = getJobDate(j)
      if (!d) return false
      return isSameDay(d, day)
    })
  }

  function getJobClientName(job) {
    if (job.client_name) return job.client_name
    const client = clients.find(c => c.id === job.client_id)
    return client?.full_name || ''
  }

  function getJobTime(job) {
    const d = getJobDate(job)
    if (!d) return null
    return format(d, 'h:mm a')
  }

  function getJobHour(job) {
    const d = getJobDate(job)
    if (!d) return null
    return d.getHours()
  }

  // ---- drag & drop ----
  function handleDragStart(e, job) {
    setDragJob(job)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', job.id)
  }

  function handleDragOver(e, day, hour) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverSlotRef.current = { day, hour }
    setDragOverSlot({ day, hour })
  }

  function handleDragLeave() {
    dragOverSlotRef.current = null
    setDragOverSlot(null)
  }

  const moveJobToSlot = useCallback((job, day, hour) => {
    const newDate = setMinutes(setHours(day, hour), 0)
    const newISOString = newDate.toISOString()
    const duration = job.scheduled_start && job.scheduled_end
      ? parseISO(job.scheduled_end).getTime() - parseISO(job.scheduled_start).getTime()
      : 3600000 // default 1 hour
    const newEnd = new Date(newDate.getTime() + duration).toISOString()

    const updatedJob = {
      ...job,
      scheduled_date: format(newDate, 'yyyy-MM-dd'),
      scheduled_start: newISOString,
      scheduled_end: newEnd,
    }

    const newList = jobs.map(j => j.id === job.id ? updatedJob : j)
    saveJobs(newList)
    return updatedJob
  }, [jobs, saveJobs])

  function handleDropOnSlot(e, day, hour) {
    e.preventDefault()
    if (!dragJob) return
    moveJobToSlot(dragJob, day, hour)
    setDragJob(null)
    setDragOverSlot(null)
    dragOverSlotRef.current = null
  }

  function handleDropOnDay(e, day) {
    e.preventDefault()
    if (!dragJob) return
    const currentHour = getJobHour(dragJob) || 9
    moveJobToSlot(dragJob, day, currentHour)
    setDragJob(null)
    setDragOverSlot(null)
    dragOverSlotRef.current = null
  }

  // ---- list view helpers ----
  function getAllScheduledJobs() {
    return filteredJobs
      .filter(j => j.scheduled_date || j.scheduled_start)
      .sort((a, b) => {
        const da = getJobDate(a) || new Date(0)
        const db = getJobDate(b) || new Date(0)
        return db - da
      })
  }

  function groupJobsByDay(jobsList) {
    const groups = {}
    jobsList.forEach(job => {
      const d = getJobDate(job)
      if (!d) return
      const day = format(d, 'yyyy-MM-dd')
      if (!groups[day]) groups[day] = []
      groups[day].push(job)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }

  const allScheduledJobs = getAllScheduledJobs()
  const groupedJobs = groupJobsByDay(allScheduledJobs)

  // ---- selection helpers ----
  function toggleJobSelection(jobId) {
    setSelectedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    )
  }

  function selectAllVisible() {
    const allIds = allScheduledJobs.map(j => j.id)
    setSelectedJobs(allIds)
  }

  function clearSelection() {
    setSelectedJobs([])
  }

  function handleOpenSelected() {
    if (selectedJobs.length === 1) {
      navigate(`/jobs/${selectedJobs[0]}`)
    } else if (selectedJobs.length > 1) {
      // Open first selected job, user can navigate back and open others
      navigate(`/jobs/${selectedJobs[0]}`)
    }
  }

  function handleOpenJob(jobId) {
    navigate(`/jobs/${jobId}`)
  }

  const sc = STATUS_COLORS

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="Schedule" description={`${allScheduledJobs.length} scheduled jobs`} />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setView('calendar'); clearSelection(); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1" />Calendar
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" />List
            </button>
          </div>
          <div className="flex items-center gap-2 ml-1">
            <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium min-w-[160px] text-center">
              {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-lg p-3 border border-gray-200">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 mr-1">Filter:</span>
        {JOB_STATUSES.map(s => {
          const active = statusFilter.length === 0 || statusFilter.includes(s.value)
          return (
            <button
              key={s.value}
              onClick={() => {
                if (s.value === 'all') { setStatusFilter([]); return }
                toggleStatusFilter(s.value)
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                s.value === 'all'
                  ? (statusFilter.length === 0 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100')
                  : (statusFilter.includes(s.value)
                    ? `${sc[s.value]?.bg || 'bg-gray-100'} ${sc[s.value]?.text || 'text-gray-700'} ${sc[s.value]?.border || 'border-gray-200'}`
                    : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50')
              }`}
            >
              {s.label}
            </button>
          )
        })}
        {statusFilter.length > 0 && (
          <button onClick={() => setStatusFilter([])} className="text-xs text-red-500 hover:text-red-700 ml-1 underline">Clear</button>
        )}
      </div>

      {view === 'calendar' && (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="text-xs font-medium text-gray-400 flex items-end justify-end pb-1 pr-2">
                <Clock className="w-3 h-3" />
              </div>
              {days.map(day => {
                const isToday = isSameDay(day, new Date())
                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center py-2 rounded-t-lg font-semibold text-sm ${isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    <span className="block text-xs opacity-75">{format(day, 'EEE')}</span>
                    <span className="block text-lg">{format(day, 'd')}</span>
                  </div>
                )
              })}
            </div>

            <div className="border border-gray-200 rounded-b-lg overflow-hidden">
              {HOURS.map(hour => (
                <div key={hour} className="grid grid-cols-8 gap-0 border-b border-gray-100 last:border-b-0">
                  <div className="text-xs text-gray-400 font-medium pr-2 py-3 text-right bg-gray-50 border-r border-gray-200 flex items-start justify-end">
                    {format(setHours(new Date(), hour), 'h a')}
                  </div>
                  {days.map(day => {
                    const isToday = isSameDay(day, new Date())
                    const isDragOver = dragOverSlot && isSameDay(dragOverSlot.day, day) && dragOverSlot.hour === hour
                    const jobAtSlot = getJobsForDay(day).find(j => getJobHour(j) === hour)

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={`relative min-h-[60px] px-1 py-0.5 border-r border-gray-100 last:border-r-0 transition-colors ${isToday ? 'bg-blue-50/40' : ''} ${isDragOver ? 'bg-blue-100 ring-2 ring-inset ring-blue-400' : ''}`}
                        onDragOver={e => handleDragOver(e, day, hour)}
                        onDragLeave={handleDragLeave}
                        onDrop={e => handleDropOnSlot(e, day, hour)}
                      >
                        {jobAtSlot && (
                          <div
                            draggable
                            onDragStart={e => handleDragStart(e, jobAtSlot)}
                            className={`rounded-md p-1.5 text-xs cursor-grab active:cursor-grabbing border ${sc[jobAtSlot.status]?.bg || 'bg-gray-100'} ${sc[jobAtSlot.status]?.border || 'border-gray-200'} shadow-sm hover:shadow-md transition-shadow`}
                          >
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${sc[jobAtSlot.status]?.dot || 'bg-gray-400'}`} />
                              <span className="font-semibold truncate text-gray-800">{jobAtSlot.title || jobAtSlot.job_number}</span>
                            </div>
                            {getJobClientName(jobAtSlot) && (
                              <div className="flex items-center gap-1 text-gray-500 truncate">
                                <User className="w-2.5 h-2.5" />
                                <span className="truncate">{getJobClientName(jobAtSlot)}</span>
                              </div>
                            )}
                            {jobAtSlot.service_type && (
                              <div className="flex items-center gap-1 text-gray-400 truncate mt-0.5">
                                <Wrench className="w-2.5 h-2.5" />
                                <span className="truncate">{jobAtSlot.service_type}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{getJobTime(jobAtSlot)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="space-y-4">
          {/* Selection action bar */}
          {selectedJobs.length > 0 && (
            <div className="sticky top-0 z-30 flex items-center justify-between gap-3 bg-blue-600 text-white rounded-xl px-4 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-5 h-5" />
                <span className="font-semibold text-sm">{selectedJobs.length} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenSelected}
                  className="text-white hover:bg-blue-500 border border-white/30"
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" />
                  Open Job{selectedJobs.length > 1 ? 's' : ''}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  className="text-white hover:bg-blue-500"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Select all bar */}
          <div className="flex items-center justify-between">
            {allScheduledJobs.length > 0 && (
              <button
                onClick={selectedJobs.length === allScheduledJobs.length ? clearSelection : selectAllVisible}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                {selectedJobs.length === allScheduledJobs.length ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedJobs.length === allScheduledJobs.length ? 'Deselect all' : `Select all (${allScheduledJobs.length})`}
              </button>
            )}
          </div>

          {groupedJobs.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-400">No scheduled jobs found</p>
            </Card>
          ) : (
            groupedJobs.map(([dayKey, dayJobs]) => {
              const dayDate = parseISO(dayKey)
              const isToday = isSameDay(dayDate, new Date())
              return (
                <div key={dayKey}>
                  <div className={`flex items-center gap-3 mb-3 pb-2 border-b ${isToday ? 'border-blue-300' : 'border-gray-200'}`}>
                    <h3 className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-800'}`}>
                      {format(dayDate, 'EEEE, MMMM d, yyyy')}
                    </h3>
                    {isToday && <Badge className="bg-blue-100 text-blue-700 text-xs">Today</Badge>}
                    <span className="text-xs text-gray-400">{dayJobs.length} job{dayJobs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dayJobs
                      .sort((a, b) => {
                        const ta = a.scheduled_start || ''
                        const tb = b.scheduled_start || ''
                        return ta.localeCompare(tb)
                      })
                      .map(j => {
                        const isSelected = selectedJobs.includes(j.id)
                        return (
                          <Card
                            key={j.id}
                            className={`p-4 hover:shadow-md transition-all cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}
                          >
                            {/* Selection checkbox + Open button row */}
                            <div className="flex items-center justify-between mb-2">
                              <button
                                onClick={e => { e.stopPropagation(); toggleJobSelection(j.id) }}
                                className="p-1 rounded hover:bg-gray-100 transition-colors"
                                title={isSelected ? 'Deselect' : 'Select'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <Square className="w-5 h-5 text-gray-300" />
                                )}
                              </button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={e => { e.stopPropagation(); handleOpenJob(j.id) }}
                                className="text-xs h-7 px-2 min-h-[36px]"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Open
                              </Button>
                            </div>

                            {/* Card content - clickable to open */}
                            <div onClick={() => handleOpenJob(j.id)} className="space-y-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-2 h-2 rounded-full ${sc[j.status]?.dot || 'bg-gray-400'}`} />
                                <p className="font-semibold text-gray-800 truncate">{j.title || j.job_number}</p>
                              </div>
                              {getJobClientName(j) && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <User className="w-3 h-3" />{getJobClientName(j)}
                                </p>
                              )}
                              {j.service_type && (
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <Wrench className="w-3 h-3" />{j.service_type}
                                </p>
                              )}
                              {j.service_address && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />{j.service_address}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                <Badge className={`text-xs px-2 py-1 ${sc[j.status]?.bg || ''} ${sc[j.status]?.text || ''} ${sc[j.status]?.border || ''}`}>
                                  {j.status?.replace(/_/g, ' ')}
                                </Badge>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  {j.scheduled_start && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(parseISO(j.scheduled_start), 'h:mm a')}
                                      {j.scheduled_end && ` – ${format(parseISO(j.scheduled_end), 'h:mm a')}`}
                                    </span>
                                  )}
                                  {j.technician && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3 shrink-0" />{j.technician}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {j.description && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{j.description}</p>
                              )}
                            </div>
                          </Card>
                        )
                      })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
