import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login      from './pages/Login'
import Dashboard  from './pages/Dashboard'
import Sows       from './pages/Sows'
import SowDetail  from './pages/SowDetail'
import AddSow     from './pages/AddSow'
import Alerts     from './pages/Alerts'
import RecordEvent from './pages/RecordEvent'

function PrivateRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>
  if (!session) return <Navigate to="/login" replace />
  return children
}

function Spinner() {
  return (
    <div className="text-center">
      <div className="w-10 h-10 border-4 border-farm-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
      <p className="text-sm text-gray-500">กำลังโหลด...</p>
    </div>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="sows" element={<Sows />} />
        <Route path="sows/add" element={<AddSow />} />
        <Route path="sows/:id" element={<SowDetail />} />
        <Route path="sows/:id/edit" element={<AddSow />} />
        <Route path="sows/:sowId/record/:cycleId" element={<RecordEvent />} />
        <Route path="alerts" element={<Alerts />} />
      </Route>
    </Routes>
  )
}
