import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ── SOWS ──────────────────────────────────────────────────────
export const sowsApi = {
  list: (farmId) =>
    supabase
      .from('sows')
      .select(`*, pens(pen_code, pen_type)`)
      .eq('farm_id', farmId)
      .eq('is_active', true)
      .order('sow_code'),

  get: (id) =>
    supabase
      .from('sows')
      .select(`*, pens(pen_code, pen_type)`)
      .eq('id', id)
      .single(),

  create: (data) =>
    supabase.from('sows').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('sows').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single(),

  deactivate: (id) =>
    supabase.from('sows').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id),
}

// ── BREEDING CYCLES ───────────────────────────────────────────
export const cyclesApi = {
  listActive: (farmId) =>
    supabase
      .from('v_active_cycles')
      .select('*')
      .eq('farm_id', farmId)
      .order('days_to_farrow'),

  listBySow: (sowId) =>
    supabase
      .from('breeding_cycles')
      .select('*')
      .eq('sow_id', sowId)
      .order('cycle_number', { ascending: false }),

  getActive: (sowId) =>
    supabase
      .from('breeding_cycles')
      .select('*')
      .eq('sow_id', sowId)
      .eq('status', 'active')
      .order('cycle_number', { ascending: false })
      .limit(1)
      .maybeSingle(),

  create: (data) =>
    supabase.from('breeding_cycles').insert(data).select().single(),

  update: (id, data) =>
    supabase.from('breeding_cycles').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single(),

  recordHeatCheck: (id, result, note, workerId) =>
    supabase.from('breeding_cycles').update({
      heat_check_date: new Date().toISOString().slice(0, 10),
      heat_check_result: result,
      heat_check_note: note,
      heat_checked_by: workerId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single(),

  recordUltrasound: (id, result, embryoCount, note, workerId) =>
    supabase.from('breeding_cycles').update({
      ultrasound_date: new Date().toISOString().slice(0, 10),
      ultrasound_result: result,
      embryo_count: embryoCount || null,
      ultrasound_note: note,
      ultrasound_by: workerId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single(),

  recordFarrowing: (id, data, workerId) =>
    supabase.from('breeding_cycles').update({
      actual_farrowing_date: new Date().toISOString().slice(0, 10),
      born_alive: data.bornAlive,
      born_dead: data.bornDead || 0,
      mummified: data.mummified || 0,
      farrowing_ease: data.ease || 'easy',
      farrowing_note: data.note,
      farrowed_by: workerId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single(),

  recordWeaning: (id, weanedCount, avgWeight, note, workerId) =>
    supabase.from('breeding_cycles').update({
      actual_weaning_date: new Date().toISOString().slice(0, 10),
      weaned_count: weanedCount,
      avg_weaning_weight_kg: avgWeight || null,
      weaning_note: note,
      weaned_by: workerId,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single(),

  markFailed: (id, reason) =>
    supabase.from('breeding_cycles').update({
      status: 'failed',
      failure_reason: reason,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id),
}

// ── ALERTS ────────────────────────────────────────────────────
export const alertsApi = {
  today: (farmId) =>
    supabase
      .from('v_alerts_today')
      .select('*')
      .eq('farm_id', farmId),

  acknowledge: (id, workerId) =>
    supabase.from('alerts').update({
      alert_status: 'acknowledged',
      acknowledged_by: workerId,
      acknowledged_at: new Date().toISOString(),
    }).eq('id', id),

  markDone: (id) =>
    supabase.from('alerts').update({ alert_status: 'done' }).eq('id', id),

  countPending: (farmId) =>
    supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('farm_id', farmId)
      .in('alert_status', ['pending', 'sent'])
      .lte('due_date', new Date().toISOString().slice(0, 10)),
}

// ── EVENTS ────────────────────────────────────────────────────
export const eventsApi = {
  listByCycle: (cycleId) =>
    supabase
      .from('cycle_events')
      .select(`*, workers(full_name, nickname)`)
      .eq('cycle_id', cycleId)
      .order('event_date', { ascending: false }),
}

// ── PENS ──────────────────────────────────────────────────────
export const pensApi = {
  list: (farmId) =>
    supabase.from('pens').select('*').eq('farm_id', farmId).eq('is_active', true).order('pen_code'),
}

// ── BOARS ─────────────────────────────────────────────────────
export const boarsApi = {
  list: (farmId) =>
    supabase.from('boars').select('*').eq('farm_id', farmId).eq('is_active', true).order('boar_code'),
}

// ── KPI ───────────────────────────────────────────────────────
export const kpiApi = {
  get: (farmId) =>
    supabase.from('v_farm_kpi').select('*').eq('farm_id', farmId).single(),
}
