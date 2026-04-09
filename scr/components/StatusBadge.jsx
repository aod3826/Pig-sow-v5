const STATUS = {
  empty:            { label: 'ว่าง',          color: 'bg-gray-100 text-gray-600' },
  mated:            { label: 'ผสมแล้ว',       color: 'bg-amber-100 text-amber-700' },
  heat_check:       { label: 'รอตรวจสัด',     color: 'bg-blue-100 text-blue-700' },
  pregnant:         { label: 'ตั้งท้อง',      color: 'bg-emerald-100 text-emerald-700' },
  late_gestation:   { label: 'บำรุงระยะท้าย', color: 'bg-teal-100 text-teal-700' },
  farrowing_ready:  { label: 'เตรียมคลอด',    color: 'bg-purple-100 text-purple-700' },
  nursing:          { label: 'เลี้ยงลูก',     color: 'bg-pink-100 text-pink-700' },
  weaned:           { label: 'หย่านม',        color: 'bg-orange-100 text-orange-700' },
  returned_heat:    { label: 'กลับสัด',       color: 'bg-red-100 text-red-600' },
  culled:           { label: 'คัดทิ้ง',       color: 'bg-gray-200 text-gray-500' },
  dead:             { label: 'ตาย',           color: 'bg-gray-300 text-gray-600' },
}

export default function StatusBadge({ status, size = 'sm' }) {
  const cfg = STATUS[status] || STATUS.empty
  const sz = size === 'lg' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'
  return (
    <span className={`rounded-full font-semibold ${sz} ${cfg.color}`}>
      {cfg.label}
    </span>
  )
}

export { STATUS }
