import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message === 'Invalid login credentials'
      ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : error.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-farm-800 to-farm-600 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">🐷</div>
        <h1 className="text-white text-2xl font-bold">ฟาร์มจัดการแม่หมู</h1>
        <p className="text-farm-200 text-sm mt-1">Smart Sow Management System</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
        <h2 className="text-gray-800 text-lg font-bold mb-6 text-center">เข้าสู่ระบบ</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">อีเมล</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="worker@farm.com"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-100 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-farm-500 focus:ring-2 focus:ring-farm-100 transition"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-farm-700 hover:bg-farm-800 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-60 mt-2"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          ติดต่อผู้จัดการฟาร์มเพื่อขอรหัสผ่าน
        </p>
      </div>
    </div>
  )
}
