import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type Persona, type Entry } from '@/lib/api'
import { Plus, Trash2, UserCheck, Users, Building2, Shield, Tags, MapPin, UsersIcon, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { cn } from '@/lib/utils'

type Tab = 'personas' | 'reportes' | 'destinos' | 'categorias'

const tabs: { key: Tab; label: string; icon: typeof Tags }[] = [
  { key: 'personas', label: 'Personal', icon: UsersIcon },
  { key: 'reportes', label: 'Reporte', icon: FileText },
  { key: 'destinos', label: 'Destinos', icon: MapPin },
  { key: 'categorias', label: 'Categorías', icon: Tags },
]

export default function ConfiguracionPage() {
  const [tab, setTab] = useState<Tab>('personas')

  const [categorias, setCategorias] = useState<string[]>([])
  const [destinos, setDestinos] = useState<string[]>([])
  const [newCategoria, setNewCategoria] = useState('')
  const [newDestino, setNewDestino] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const [personas, setPersonas] = useState<Persona[]>([])
  const [newPlaca, setNewPlaca] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [newCat, setNewCat] = useState('Empleado')
  const [newPersonaDestino, setNewPersonaDestino] = useState('')
  const categoriaOrder: Record<string, number> = { Residente: 0, Empleado: 1, Visitante: 2 }
  const [personalSubTab, setPersonalSubTab] = useState<'todos' | 'empleados' | 'visitantes' | 'residentes' | 'seguridad'>('todos')

  const catFilter = (st: string) => st === 'todos' ? true : st === 'empleados' ? 'empleado' : st === 'residentes' ? 'residente' : st === 'visitantes' ? 'visitante' : 'seguridad'
  const filteredPersonas = personas.filter((p) => {
    if (personalSubTab === 'todos') return true
    return p.categoria.toLowerCase() === catFilter(personalSubTab)
  })

  useEffect(() => {
    api.getConfig('categorias').then((c) => setCategorias(c.value)).catch(() => {})
    api.getConfig('destinos').then((d) => setDestinos(d.value)).catch(() => {})
    api.listPersonas().then((data) => {
      const sorted = [...data].sort((a, b) =>
        (categoriaOrder[a.categoria] ?? 99) - (categoriaOrder[b.categoria] ?? 99)
      )
      setPersonas(sorted)
    }).catch(() => {})
  }, [])

  const addCategoria = () => {
    const val = newCategoria.trim()
    if (val && !categorias.includes(val)) {
      setCategorias([...categorias, val])
      setNewCategoria('')
    }
  }

  const removeCategoria = (idx: number) => {
    setCategorias(categorias.filter((_, i) => i !== idx))
  }

  const addDestino = () => {
    const val = newDestino.trim()
    if (val && !destinos.includes(val)) {
      setDestinos([...destinos, val])
      setNewDestino('')
    }
  }

  const removeDestino = (idx: number) => {
    setDestinos(destinos.filter((_, i) => i !== idx))
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await Promise.all([
        api.updateConfig('categorias', categorias),
        api.updateConfig('destinos', destinos),
      ])
      setMessage('Configuración guardada')
    } catch {
      setMessage('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const addPersona = async () => {
    if (!newPlaca.trim() || !newNombre.trim()) return
    try {
      const p = await api.createPersona({ placa: newPlaca, nombre: newNombre, categoria: newCat, destino: newPersonaDestino })
      setPersonas([...personas, p].sort((a, b) =>
        (categoriaOrder[a.categoria] ?? 99) - (categoriaOrder[b.categoria] ?? 99)
      ))
      setNewPlaca('')
      setNewNombre('')
      setNewPersonaDestino('')
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const removePersona = async (id: string) => {
    try {
      await api.deletePersona(id)
      setPersonas(personas.filter((p) => p.id !== id))
    } catch {
      setMessage('Error al eliminar')
    }
  }

  const catIcon = (cat: string) => {
    switch (cat) {
      case 'Empleado': return <UserCheck className="h-3.5 w-3.5" />
      case 'Visitante': return <Users className="h-3.5 w-3.5" />
      case 'Residente': return <Building2 className="h-3.5 w-3.5" />
      case 'Seguridad': return <Shield className="h-3.5 w-3.5" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>

      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        {tabs.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {message && (
        <p className={`text-sm ${message.includes('Error') ? 'text-destructive' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {tab === 'personas' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Personal Registrado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
              {(['todos', 'empleados', 'visitantes', 'residentes', 'seguridad'] as const).map((st) => {
                const active = personalSubTab === st
                return (
                  <button
                    key={st}
                    onClick={() => setPersonalSubTab(st)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                      active
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {st === 'empleados' && <UserCheck className="h-3.5 w-3.5" />}
                    {st === 'visitantes' && <Users className="h-3.5 w-3.5" />}
                    {st === 'residentes' && <Building2 className="h-3.5 w-3.5" />}
                    {st === 'seguridad' && <Shield className="h-3.5 w-3.5" />}
                    {st === 'todos' ? 'Todos' : st}
                    <span className="text-[10px] text-muted-foreground ml-0.5">
                      ({st === 'todos' ? personas.length : personas.filter(p => p.categoria.toLowerCase() === catFilter(st)).length})
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <Input
                value={newPlaca}
                onChange={(e) => setNewPlaca(e.target.value.toUpperCase())}
                placeholder="Placa"
              />
              <Input
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Nombre completo"
              />
              <select
                value={newCat}
                onChange={(e) => {
                  setNewCat(e.target.value)
                  if (!newPersonaDestino) setNewPersonaDestino(e.target.value)
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                value={newPersonaDestino}
                onChange={(e) => setNewPersonaDestino(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Sin destino</option>
                {destinos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <Button onClick={addPersona}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {filteredPersonas.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    {catIcon(p.categoria)}
                    <span className="font-mono font-medium">{p.placa}</span>
                    <span className="text-muted-foreground">{p.nombre}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.categoria}</span>
                    {p.destino && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{p.destino}</span>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePersona(p.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              ))}
              {filteredPersonas.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin personas registradas</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'reportes' && (
        <ReportesSection />
      )}

      {tab === 'destinos' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Destinos</CardTitle>
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newDestino}
                onChange={(e) => setNewDestino(e.target.value)}
                placeholder="Nuevo destino"
                onKeyDown={(e) => e.key === 'Enter' && addDestino()}
              />
              <Button size="icon" variant="outline" onClick={addDestino}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {destinos.map((dst, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  {dst}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeDestino(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              ))}
              {destinos.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin destinos</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'categorias' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorías</CardTitle>
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newCategoria}
                onChange={(e) => setNewCategoria(e.target.value)}
                placeholder="Nueva categoría"
                onKeyDown={(e) => e.key === 'Enter' && addCategoria()}
              />
              <Button size="icon" variant="outline" onClick={addCategoria}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {categorias.map((cat, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  {cat}
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCategoria(i)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                  </Button>
                </div>
              ))}
              {categorias.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin categorías</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ReportesSection() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  const cargar = async () => {
    try {
      const data = await api.getEntries({
        ...(categoriaFiltro && { categoria: categoriaFiltro }),
        ...(desde && { desde: desde + 'T00:00:00' }),
        ...(hasta && { hasta }),
      })
      setEntries(data)
    } catch {
      setEntries([])
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const generarPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('REPORTE INGRESO DE PERSONAL FINCA TENNIS', 105, 20, { align: 'center' })
    doc.setFontSize(8)
    let y = 26
    doc.setFont('Helvetica', 'bold')
    doc.text('Generado:', 14, y)
    doc.setFont('Helvetica', 'normal')
    doc.text(new Date().toLocaleString(), 40, y)
    y += 4.5
    if (categoriaFiltro) {
      doc.setFont('Helvetica', 'bold')
      doc.text('Categoría:', 14, y)
      doc.setFont('Helvetica', 'normal')
      doc.text(categoriaFiltro, 40, y)
      y += 4.5
    }
    if (desde || hasta) {
      doc.setFont('Helvetica', 'bold')
      doc.text('Fechas:', 14, y)
      doc.setFont('Helvetica', 'normal')
      doc.text(`${desde || '—'} a ${hasta || '—'}`, 40, y)
    }

    const yStart = desde || hasta || categoriaFiltro ? y + 6 : y + 6

    autoTable(doc, {
      startY: yStart,
      head: [['Nombre', 'Placa', 'Categoría', 'Destino', 'Ingreso', 'Salida']],
      body: entries.map((e) => [
        e.nombre,
        e.placa,
        e.categoria,
        e.destino,
        e.ingreso ? new Date(e.ingreso).toLocaleString('es-ES') : '—',
        e.salida ? new Date(e.salida).toLocaleString('es-ES') : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [75, 85, 99], halign: 'center' },
    })

    doc.save(`reporte-ingresos-${Date.now()}.pdf`)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Reporte Ingreso De Personal Finca Tennis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Categoría</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="flex h-9 w-40 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              <option value="">Todas</option>
              <option value="Empleado">Empleados</option>
              <option value="Visitante">Visitantes</option>
              <option value="Residente">Residentes</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-9 w-40" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-9 w-40" />
          </div>
          <Button onClick={cargar} size="sm" className="h-9">Buscar</Button>
          <Button onClick={generarPDF} size="sm" variant="outline" className="h-9 ml-auto" disabled={entries.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Placa</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoría</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Destino</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ingreso</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Salida</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">{e.nombre}</td>
                  <td className="px-4 py-2.5 font-mono">{e.placa}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{e.categoria}</span>
                  </td>
                  <td className="px-4 py-2.5">{e.destino}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.ingreso ? new Date(e.ingreso).toLocaleString('es-ES') : '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {e.salida ? new Date(e.salida).toLocaleString('es-ES') : ''}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
