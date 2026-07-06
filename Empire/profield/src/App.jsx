import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DataProvider, useData } from './context'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Clients from './pages/Clients'
import Estimates from './pages/Estimates'
import EstimateDetail from './pages/EstimateDetail'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import Schedule from './pages/Schedule'
import Reports from './pages/Reports'
import Services from './pages/Services'
import AIAssistant from './pages/AIAssistant'
import AppFlowy from './pages/AppFlowy'
import Integrations from './pages/Integrations'
import Settings from './pages/Settings'
import Inbox from './pages/Inbox'
import AdminKeys from './pages/AdminKeys'
import ClientPortal from './pages/ClientPortal'
import JobPortal from './pages/JobPortal'
import InvoicePortal from './pages/InvoicePortal'
import InvoicePdfView from './pages/InvoicePdfView'
import LeadForm from './pages/LeadForm'
import Login from './pages/Login'

function LoadingScreen() {
  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 text-sm">
      Loading Aqua Logic Plumbing Portal…
    </div>
  )
}

function ProtectedLayout() {
  const { authReady, isAuthenticated } = useData()
  if (!authReady) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Layout />
}

function LoginRoute() {
  const { authReady, isAuthenticated } = useData()
  if (!authReady) return <LoadingScreen />
  if (isAuthenticated) return <Navigate to="/" replace />
  return <Login />
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/admin" element={<AdminKeys />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/portal/:estimateId" element={<ClientPortal />} />
        <Route path="/job-portal/:jobId" element={<JobPortal />} />
        <Route path="/invoice-portal/:invoiceId" element={<InvoicePortal />} />
        <Route path="/invoice-pdf/:invoiceId" element={<InvoicePdfView />} />
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/lead-form" element={<LeadForm />} />

        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<Leads />} />
          <Route path="clients" element={<Clients />} />
          <Route path="estimates" element={<Estimates />} />
          <Route path="estimates/new" element={<EstimateDetail />} />
          <Route path="estimates/:id" element={<EstimateDetail />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="reports" element={<Reports />} />
          <Route path="services" element={<Services />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="appflowy" element={<AppFlowy />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<Settings />} />
          <Route path="jarvis" element={<AIAssistant />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <DataProvider>
      <AppRoutes />
    </DataProvider>
  )
}
