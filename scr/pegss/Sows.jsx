import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { sowsApi, cyclesApi, alertsApi } from '../lib/supabase'
import SowCard from '../components/SowCard'
import StatusBadge, { STATUS } from '../components/StatusBadge'

const FILTERS = [
  { key: 'all',            label: 'ทั้งหมด' },
  { key: 'mated',          label: 'ผสมแล้ว' },
  { key: 'pregnant',       label: 'ตั้งท้อง' },
  { key: 'farrowing_ready',label: 'เตรียมคลอด' },
  { key: 'nursing',        label: 'เลี้ยงลูก' },
  { key: 'weaned',         label: 'หย่านม' },
  { key: 'empty',          label: 'ว่าง' },
]

export default function Sows() {
  const { farmId } = useAuth()
  const navigate   = useNavigate()
  const [sows,     setSows]     = useState([])
  const [cycles,   setCycles]   = useState({}) // sowId → cycle
  const [alertMap, setAlertMap] = useState({}) // sowId → alerts[]
  const [filter,   setFilter]   = useState('all')
  const [query,    setQuery]    = useState('')
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!farmId) return
    Promise.all([
      sowsApi.list(farmId),
      cyclesApi.listActive(farmId),
      alertsApi.today(farmId),
    ]).then(([s, c, a]) => {
      setSows(s.data || [])
      // Map cycles by sow_id
      const cMap = {}
      ;(c.data || []).forEach(cy => { cMap[cy.sow_id] = cy })
      setCycles(cMap)
      // Map alerts by sow_id
      const aMap = {}
      ;(a.data || []).forEach(al => {
        if (!aMap[al.sow_id]) aMap[al.sow_id] = []
        aMap[al.sow_id].push(al)
      })
      setAlertMap(aMap)
      setLoading(false)
    })
  }, [farmId])

  const filtered = useMemo(() => {
    let list = sows
    if (filter !== 'all') list = list.filter(s => s.current_status === filter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(s =>
        s.sow_code.toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.pens?.pen_code || '').toLowerCase().includes(q)
      )
    }
    // Sort: alerts first, then by status, then by code
    return list.sort((a, b) => {
      const aAlert = (alertMap[a.id] || []).length > 0
      const bAlert = (alertMap[b.id] || []).length > 0
      if (aAlert && !bAlert) return -1
      if (!aAlert && bAlert) return 1
      return a.sow_code.localeCompare(b.sow_code)
    })
  }, [sows, filter, query, alertMap])

  const counts = useMemo(() => {
    const m = {}
    sows.forEach(s => { m[s.current_status] = (m[s.current_status] || 0) + 1 })
    return m
  }, [sows])

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-br from-farm-800 to-farm-600 px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-xl font-bold">🐷 รายชื่อแม่หมู</h1>
          <button
            onClick={() => navigate('/sows/add')}
            className="bg-white text-farm-700 font-bold text-sm px-4 py-2 rounded-xl shadow active:opacity-80"
          >
            + เพิ่ม
          </button>
        </div>
        {/* Search */}
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ค้นหารหัส, ชื่อ, คอก..."
            className="w-full bg-white/20 text-white placeholder-white/60 rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white/30 transition"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-2.5 text-white/70">✕</button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-100">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
              filter === f.key
                ? 'bg-farm-700 text-white shadow'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
            {counts[f.key] ? ` (${counts[f.key]})` : f.key === 'all' ? ` (${sows.length})` : ''}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-farm-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🐷</div>
            <p className="text-gray-500 font-semibold">ไม่พบแม่หมู</p>
            <p className="text-gray-400 text-sm mt-1">
              {query ? 'ลองเปลี่ยนคำค้นหา' : 'กดปุ่ม + เพิ่ม เพื่อเริ่มต้น'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 font-medium">พบ {filtered.length} ตัว</p>
            {filtered.map(sow => (
              <SowCard
                key={sow.id}
                sow={sow}
                cycle={cycles[sow.id]}
                alerts={alertMap[sow.id] || []}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
