const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Entry {
  id: string
  placa: string
  nombre: string
  categoria: string
  destino: string
  ingreso: string | null
  salida: string | null
  activo: boolean
}

export interface Persona {
  id: string
  placa: string
  nombre: string
  categoria: string
  destino: string
}

export interface Config {
  key: string
  value: string[]
}

export interface Stats {
  total: number
  activos: number
  empleados: number
  visitantes: number
  residentes: number
}

export interface IngresoResultado {
  accion: 'ingreso' | 'salida'
  entry: Entry
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Error de conexión')
  }
  return res.json()
}

export const api = {
  // Personas
  searchPersonas: (q: string) =>
    request<Persona[]>(`/api/personas?q=${encodeURIComponent(q)}`),

  createPersona: (data: { placa: string; nombre: string; categoria: string; destino?: string }) =>
    request<Persona>('/api/personas', { method: 'POST', body: JSON.stringify(data) }),

  updatePersona: (id: string, data: { placa: string; nombre: string; categoria: string; destino?: string }) =>
    request<Persona>(`/api/personas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deletePersona: (id: string) =>
    request<{ ok: boolean }>(`/api/personas/${id}`, { method: 'DELETE' }),

  listPersonas: () => request<Persona[]>('/api/personas'),

  // Ingreso automático
  ingresoAutomatico: (placa: string, overrides?: { nombre?: string; categoria?: string; destino?: string }) =>
    request<IngresoResultado>('/api/ingreso-automatico', {
      method: 'POST',
      body: JSON.stringify({ placa, ...overrides }),
    }),

  // Entries
  createEntry: (data: { placa: string; nombre: string; categoria: string; destino: string }) =>
    request<Entry>('/api/entries', { method: 'POST', body: JSON.stringify(data) }),

  getEntries: (params?: { activo?: boolean; categoria?: string; desde?: string; hasta?: string; sin_ingreso?: boolean; salida_desde?: string; salida_hasta?: string }) => {
    const query = new URLSearchParams()
    if (params?.activo !== undefined) query.set('activo', String(params.activo))
    if (params?.categoria) query.set('categoria', params.categoria)
    if (params?.desde) query.set('desde', params.desde)
    if (params?.hasta) query.set('hasta', params.hasta)
    if (params?.sin_ingreso !== undefined) query.set('sin_ingreso', String(params.sin_ingreso))
    if (params?.salida_desde) query.set('salida_desde', params.salida_desde)
    if (params?.salida_hasta) query.set('salida_hasta', params.salida_hasta)
    return request<Entry[]>(`/api/entries?${query}`)
  },

  registerSalida: (id: string) =>
    request<Entry>(`/api/entries/${id}/salida`, { method: 'PUT' }),

  registrarIngresoResidente: (placa: string) =>
    request<Entry>(`/api/entries/registrar-ingreso/${encodeURIComponent(placa)}`, { method: 'PUT' }),

  getStats: () => request<Stats>('/api/stats'),

  // Config
  getConfig: (key: string) => request<Config>(`/api/config/${key}`),

  updateConfig: (key: string, value: string[]) =>
    request<Config>(`/api/config/${key}`, { method: 'PUT', body: JSON.stringify({ value }) }),
}
