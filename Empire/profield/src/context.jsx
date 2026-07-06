import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  pb,
  clients as clientsApi,
  leads as leadsApi,
  estimates as estimatesApi,
  jobs as jobsApi,
  invoices as invoicesApi,
  payments as paymentsApi,
  serviceTypes as serviceTypesApi,
  settings as settingsApi,
  login as pbLogin,
  logout as pbLogout,
  getCurrentUser,
  isAuthenticated as pbIsAuthenticated,
  onAuthChange,
  loginWithGoogle as pbLoginWithGoogle,
} from './services/pocketbase'
import { generateId, generateNumber, calcSubtotal } from './store'

const DataContext = createContext(null)

const defaultServiceTypes = [
  { id: 'service-hvac-repair', name: 'HVAC Repair', rate: 125 },
  { id: 'service-plumbing', name: 'Plumbing', rate: 110 },
  { id: 'service-electrical', name: 'Electrical', rate: 135 },
  { id: 'service-appliance-repair', name: 'Appliance Repair', rate: 95 },
  { id: 'service-general-maintenance', name: 'General Maintenance', rate: 85 },
  { id: 'service-installation', name: 'Installation', rate: 150 },
]

const defaultSettings = {
  id: 'settings-singleton',
  app_id: 'settings-singleton',
  businessName: 'Aqua Logic Plumbing',
  defaultTaxRate: 0,
  defaultPaymentTerms: 'Net 30',
  defaultEstimateTerms: 'This estimate is valid for 30 days.',
  defaultInvoiceNotes: 'Thank you for your business!',
  apiKey: 'pk_live_' + Math.random().toString(36).substr(2, 24),
}

const defaultData = {
  clients: [],
  leads: [],
  estimates: [],
  jobs: [],
  invoices: [],
  payments: [],
  serviceTypes: defaultServiceTypes,
  settings: defaultSettings,
}

const COLLECTION_APIS = {
  clients: clientsApi,
  leads: leadsApi,
  estimates: estimatesApi,
  jobs: jobsApi,
  invoices: invoicesApi,
  payments: paymentsApi,
  serviceTypes: serviceTypesApi,
}

async function safeList(api, fallback = []) {
  try {
    return await api.list()
  } catch (err) {
    // If auth error, clear the token so user is prompted to log in
    if (err?.status === 401 || err?.status === 403) {
      pb.authStore.clear()
    }
    return fallback
  }
}

// Seed default service types and settings into PocketBase if they don't exist
async function seedDefaults() {
  try {
    // Seed service types
    const existingST = await serviceTypesApi.list()
    if (existingST.length === 0) {
      for (const st of defaultServiceTypes) {
        try {
          await serviceTypesApi.create(st)
        } catch (e) {
          console.warn('Failed to seed service type:', st.name, e.message)
        }
      }
    }

    // Seed settings
    try {
      const existingSettings = await settingsApi.get()
      if (!existingSettings) {
        await settingsApi.update({ ...defaultSettings })
      }
    } catch {
      // Settings might not exist yet, try creating via collection
      try {
        await pb.collection('settings').create({
          ...defaultSettings,
          id: undefined,
        })
      } catch (e) {
        console.warn('Failed to seed settings:', e.message)
      }
    }
  } catch (e) {
    console.warn('Seed defaults failed:', e.message)
  }
}

export function DataProvider({ children }) {
  const [data, setData] = useState(defaultData)
  const [authReady, setAuthReady] = useState(true)
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState({ id: 'mock-user', email: 'demo@profield.app', name: 'Demo User' })
  const [pbError, setPbError] = useState('')
  const subscriptionsRef = useRef([])
  const dataRef = useRef(data)
  const authInitRef = useRef(false)
  dataRef.current = data

  const isAuthenticated = true

  const clearSubscriptions = useCallback(async () => {
    try {
      subscriptionsRef.current.forEach(sub => {
        if (typeof sub === 'function') sub()
      })
      subscriptionsRef.current = []
      await pb.realtime.unsubscribe()
    } catch {
      // ignore
    }
  }, [])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setPbError('')
    try {
      const [clients, leads, estimates, jobs, invoices, payments, serviceTypes, settings] = await Promise.all([
        safeList(clientsApi),
        safeList(leadsApi),
        safeList(estimatesApi),
        safeList(jobsApi),
        safeList(invoicesApi),
        safeList(paymentsApi, []),
        safeList(serviceTypesApi, defaultServiceTypes),
        settingsApi.get().catch(() => defaultSettings),
      ])

      const nextData = {
        clients,
        leads,
        estimates,
        jobs,
        invoices,
        payments,
        serviceTypes: serviceTypes.length ? serviceTypes : defaultServiceTypes,
        settings: settings || defaultSettings,
      }

      setData(nextData)
      dataRef.current = nextData
    } catch (err) {
      console.error('PocketBase load failed:', err)
      setPbError(err?.message || 'Failed to load PocketBase data')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCollection = useCallback(async (key) => {
    if (key === 'settings') {
      const settings = await settingsApi.get().catch(() => dataRef.current.settings)
      setData(prev => ({ ...prev, settings: settings || prev.settings }))
      return
    }
    const api = COLLECTION_APIS[key]
    if (!api) return
    const list = await api.list().catch(() => dataRef.current[key])
    setData(prev => ({ ...prev, [key]: list }))
    dataRef.current = { ...dataRef.current, [key]: list }
  }, [])

  const setupSubscriptions = useCallback(async () => {
    await clearSubscriptions()

    const pairs = [
      ['clients', 'clients'],
      ['leads', 'leads'],
      ['estimates', 'estimates'],
      ['jobs', 'jobs'],
      ['invoices', 'invoices'],
      ['payments', 'payments'],
      ['service_types', 'serviceTypes'],
      ['settings', 'settings'],
    ]

    for (const [collectionName, key] of pairs) {
      try {
        const unsub = await pb.collection(collectionName).subscribe('*', async (e) => {
          // Debounce rapid updates
          await refreshCollection(key)
        })
        subscriptionsRef.current.push(() => {
          try {
            pb.collection(collectionName).unsubscribe('*')
          } catch {
            // ignore
          }
          if (typeof unsub === 'function') unsub()
        })
      } catch (err) {
        console.warn(`Subscription setup failed for ${collectionName}:`, err)
      }
    }
  }, [clearSubscriptions, refreshCollection])

  // Auth change handler
  useEffect(() => {
    const unsubscribe = onAuthChange(async (user, valid) => {
      setCurrentUser(user)
      if (valid && user) {
        setLoading(true);
        try {
          await seedDefaults()
          await loadAllData()
          await setupSubscriptions()
        } catch (err) {
          console.error('Data load failed:', err)
        } finally {
          setLoading(false)
        }
      } else {
        await clearSubscriptions()
        setLoading(false)
        setData(defaultData)
        dataRef.current = defaultData
      }
    })

    return () => {
      unsubscribe?.()
    }
  }, [loadAllData, setupSubscriptions, clearSubscriptions])

  // Initial load
  useEffect(() => {
    if (authInitRef.current) return
    authInitRef.current = true

    const init = async () => {
      setAuthReady(true)
      if (pbIsAuthenticated() && getCurrentUser()) {
        await seedDefaults()
        await loadAllData()
        await setupSubscriptions()
      }
    }

    init()

    return () => {
      clearSubscriptions()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Email action polling (for estimate approvals/declines)
  useEffect(() => {
    if (!isAuthenticated) return

    async function checkClientActions() {
      try {
        const resp = await fetch('/api/actions')
        if (!resp.ok) return
        const result = await resp.json()
        if (!result.success || !result.actions?.length) return

        const actions = result.actions
        const current = dataRef.current
        let updatedEstimates = [...(current.estimates || [])]
        const processedIds = []

        for (const action of actions) {
          const idx = updatedEstimates.findIndex(e => e.id === action.estimate_id)
          if (idx >= 0) {
            const updated = {
              ...updatedEstimates[idx],
              status: action.action,
              client_action_at: new Date(action.timestamp * 1000).toISOString(),
            }
            updatedEstimates[idx] = updated
            try {
              // Use the estimate's app_id for the update
              await estimatesApi.update(updated.id, updated)
            } catch (err) {
              console.error('Failed syncing email action to PocketBase:', err)
            }
            processedIds.push(action.estimate_id)
          }
        }

        if (processedIds.length) {
          setData(prev => ({ ...prev, estimates: updatedEstimates }))
          dataRef.current = { ...dataRef.current, estimates: updatedEstimates }
          await fetch('/api/actions/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: processedIds }),
          })
        }
      } catch (err) {
        console.error('Failed to poll client actions:', err)
      }
    }

    checkClientActions()
    const interval = setInterval(checkClientActions, 10000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  function getData() {
    return dataRef.current
  }

  async function saveCollection(key, nextItems) {
    const api = COLLECTION_APIS[key]
    const prevItems = dataRef.current[key] || []
    setData(prev => ({ ...prev, [key]: nextItems }))
    dataRef.current = { ...dataRef.current, [key]: nextItems }
    if (!api || !isAuthenticated) return nextItems
    try {
      const refreshed = await api.sync(prevItems, nextItems)
      setData(prev => ({ ...prev, [key]: refreshed }))
      dataRef.current = { ...dataRef.current, [key]: refreshed }
      return refreshed
    } catch (err) {
      console.error(`Failed saving ${key}:`, err)
      setPbError(err?.message || `Failed saving ${key}`)
      await refreshCollection(key)
      return prevItems
    }
  }

  async function saveClients(clients) { return saveCollection('clients', clients) }
  async function saveLeads(leads) { return saveCollection('leads', leads) }
  async function saveEstimates(estimates) { return saveCollection('estimates', estimates) }
  async function saveJobs(jobs) { return saveCollection('jobs', jobs) }
  async function saveInvoices(invoices) { return saveCollection('invoices', invoices) }
  async function savePayments(payments) { return saveCollection('payments', payments) }
  async function saveServiceTypes(serviceTypes) { return saveCollection('serviceTypes', serviceTypes) }

  async function saveSettings(settings) {
    setData(prev => ({ ...prev, settings }))
    dataRef.current = { ...dataRef.current, settings }
    if (!isAuthenticated) return settings
    try {
      const saved = await settingsApi.update(settings)
      setData(prev => ({ ...prev, settings: saved }))
      dataRef.current = { ...dataRef.current, settings: saved }
      return saved
    } catch (err) {
      console.error('Failed saving settings:', err)
      setPbError(err?.message || 'Failed saving settings')
      return settings
    }
  }

  function addEntity(key, item, defaults = {}) {
    const optimistic = {
      ...item,
      ...defaults,
      id: item.id || generateId(),
      app_id: item.app_id || item.id || generateId(),
      created_at: item.created_at || new Date().toISOString(),
    }
    const next = [...(dataRef.current[key] || []), optimistic]
    saveCollection(key, next)
    return optimistic
  }

  function addClient(client) {
    return addEntity('clients', client)
  }

  function addLead(lead) {
    return addEntity('leads', lead, { status: 'new' })
  }

  function addEstimate(estimate) {
    const num = generateNumber('EST', dataRef.current.estimates, 'estimate_number')
    return addEntity('estimates', estimate, { estimate_number: num, status: 'draft' })
  }

  function addJob(job) {
    const num = generateNumber('JOB', dataRef.current.jobs, 'job_number')
    return addEntity('jobs', job, { job_number: num, status: 'scheduled' })
  }

  function addInvoice(invoice) {
    const num = generateNumber('INV', dataRef.current.invoices, 'invoice_number')
    return addEntity('invoices', invoice, { invoice_number: num, status: 'draft' })
  }

  function convertLeadToClient(leadId) {
    const lead = dataRef.current.leads.find(l => l.id === leadId)
    if (!lead) return null
    const client = addClient({
      full_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      address: lead.address,
      notes: lead.notes,
    })
    // Mark as "client_created" instead of "converted" so Estimate/Invoice buttons remain visible
    saveLeads((dataRef.current.leads || []).map(l => l.id === leadId ? { ...l, status: 'client_created' } : l))
    return client
  }

  function createEstimateFromLead(leadId) {
    const lead = dataRef.current.leads.find(l => l.id === leadId)
    if (!lead) return null
    const lineItems = []
    if (lead.estimated_value && parseFloat(lead.estimated_value) > 0) {
      lineItems.push({
        id: generateId(),
        description: lead.service_needed || 'Services',
        quantity: 1,
        unit_price: parseFloat(lead.estimated_value),
        total: parseFloat(lead.estimated_value),
      })
    }
    const est = addEstimate({
      client_name: lead.name,
      client_email: lead.email || '',
      client_phone: lead.phone || '',
      service_address: lead.address || '',
      title: lead.service_needed || 'Estimate for ' + lead.name,
      description: lead.notes || '',
      service_type: lead.service_needed || '',
      line_items: lineItems,
      preferred_date: lead.preferred_date || '',
      tax_rate: 0,
      discount_amount: 0,
      terms: 'This estimate is valid for 30 days.',
    })
    return est.id
  }

  function convertEstimateToJob(estimateId) {
    const est = dataRef.current.estimates.find(e => e.id === estimateId)
    if (!est) return null
    const cleanLineItems = (est.line_items || []).map(item => ({
      id: item.id || generateId(),
      description: item.description || '',
      quantity: item.quantity || item.qty || 1,
      unit_price: item.unit_price || item.price || 0,
      total: (item.quantity || item.qty || 1) * (item.unit_price || item.price || 0),
    }))
    const st = calcSubtotal(cleanLineItems)
    const taxAmt = st * ((est.tax_rate || 0) / 100)
    const totalAmt = st + taxAmt - (est.discount_amount || 0)
    const job = addJob({
      client_id: est.client_id,
      client_name: est.client_name || '',
      client_email: est.client_email || '',
      client_phone: est.client_phone || '',
      title: est.title || '',
      description: est.description || '',
      address: est.service_address || '',
      service_address: est.service_address || '',
      service_type: est.service_type || '',
      line_items: cleanLineItems,
      preferred_date: est.preferred_date || '',
      scheduled_date: est.preferred_date || '',
      tax_rate: est.tax_rate || 0,
      discount_amount: est.discount_amount || 0,
      subtotal: st, tax_amount: taxAmt, total_amount: totalAmt,
    })
    saveEstimates((dataRef.current.estimates || []).map(e => e.id === estimateId ? { ...e, status: 'converted' } : e))
    return job
  }

  function convertEstimateToInvoice(estimateId) {
    const est = dataRef.current.estimates.find(e => e.id === estimateId)
    if (!est) return null
    const cleanLineItems = (est.line_items || []).map(item => ({
      id: item.id || generateId(),
      description: item.description || '',
      quantity: item.quantity || item.qty || 1,
      unit_price: item.unit_price || item.price || 0,
      total: (item.quantity || item.qty || 1) * (item.unit_price || item.price || 0),
    }))
    const st = calcSubtotal(cleanLineItems)
    const taxAmt = st * ((est.tax_rate || 0) / 100)
    const totalAmt = st + taxAmt - (est.discount_amount || 0)
    const inv = addInvoice({
      client_id: est.client_id,
      client_name: est.client_name || '',
      client_email: est.client_email || '',
      client_phone: est.client_phone || '',
      title: est.title || '',
      service_address: est.service_address || '',
      line_items: cleanLineItems,
      tax_rate: est.tax_rate || 0,
      discount_amount: est.discount_amount || 0,
      subtotal: st, tax_amount: taxAmt, total_amount: totalAmt,
      notes: est.terms || '',
    })
    saveEstimates((dataRef.current.estimates || []).map(e => e.id === estimateId ? { ...e, status: 'converted' } : e))
    return inv
  }

  function convertJobToInvoice(jobId) {
    const job = dataRef.current.jobs.find(j => j.id === jobId)
    if (!job) return null
    const est = dataRef.current.estimates.find(e => e.id === job.estimate_id)
    const cleanLineItems = (est?.line_items || job.line_items || []).map(item => ({
      id: item.id || generateId(),
      description: item.description || '',
      quantity: item.quantity || item.qty || 1,
      unit_price: item.unit_price || item.price || 0,
      total: (item.quantity || item.qty || 1) * (item.unit_price || item.price || 0),
    }))
    const st = calcSubtotal(cleanLineItems)
    const taxRate = est?.tax_rate || job.tax_rate || 0
    const taxAmt = st * (taxRate / 100)
    const discountAmt = est?.discount_amount || job.discount_amount || 0
    const totalAmt = st + taxAmt - discountAmt
    const inv = addInvoice({
      client_id: job.client_id,
      client_name: job.client_name || '',
      client_email: job.client_email || '',
      client_phone: job.client_phone || '',
      title: job.title || '',
      service_address: job.service_address || job.address || '',
      line_items: cleanLineItems,
      tax_rate: taxRate, discount_amount: discountAmt,
      subtotal: st, tax_amount: taxAmt, total_amount: totalAmt,
    })
    saveJobs((dataRef.current.jobs || []).map(j => j.id === jobId ? { ...j, status: 'completed', invoiced: true } : j))
    return inv
  }

  async function login(email, password) {
    setPbError('')
    setLoading(true)
    try {
      const result = await pbLogin(email, password)
      setCurrentUser(result.record || getCurrentUser())
      await seedDefaults()
      await loadAllData()
      await setupSubscriptions()
      return { success: true }
    } catch (err) {
      const message = err?.message || 'Login failed'
      setPbError(message)
      return { success: false, message }
    } finally {
      setLoading(false)
      setAuthReady(true)
    }
  }

  async function loginWithGoogle() {
    setPbError('')
    setLoading(true)
    try {
      const authData = await pbLoginWithGoogle()
      setCurrentUser(authData.record || getCurrentUser())
      await seedDefaults()
      await loadAllData()
      await setupSubscriptions()
      return { success: true }
    } catch (err) {
      const message = err?.message || 'Google sign-in failed'
      setPbError(message)
      return { success: false, message }
    } finally {
      setLoading(false)
      setAuthReady(true)
    }
  }

  async function logout() {
    pbLogout()
    setCurrentUser(null)
    setData(defaultData)
    dataRef.current = defaultData
    await clearSubscriptions()
  }

  const value = useMemo(() => ({
    ...data,
    getData,
    loading,
    authReady,
    currentUser,
    isAuthenticated,
    pbError,
    login,
    loginWithGoogle,
    logout,
    refreshAll: loadAllData,
    saveClients,
    saveLeads,
    saveEstimates,
    saveJobs,
    saveInvoices,
    savePayments,
    saveSettings,
    saveServiceTypes,
    addClient,
    addLead,
    addEstimate,
    addJob,
    addInvoice,
    convertLeadToClient,
    createEstimateFromLead,
    convertEstimateToJob,
    convertEstimateToInvoice,
    convertJobToInvoice,
  }), [
    data, loading, authReady, currentUser, isAuthenticated, pbError,
    login, loginWithGoogle, logout, loadAllData,
    saveClients, saveLeads, saveEstimates, saveJobs, saveInvoices,
    savePayments, saveSettings, saveServiceTypes,
    addClient, addLead, addEstimate, addJob, addInvoice,
    convertLeadToClient, createEstimateFromLead,
    convertEstimateToJob, convertEstimateToInvoice, convertJobToInvoice,
  ])

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
