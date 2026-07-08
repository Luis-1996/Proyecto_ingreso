import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type Persona, type Entry } from '@/lib/api'
import { Plus, Trash2, Pencil, UserCheck, Users, Building2, Shield, Tags, MapPin, UsersIcon, FileText, FileSpreadsheet } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const catIcon = (cat: string) => {
  switch (cat) {
    case 'Empleado': return <UserCheck className="h-3.5 w-3.5" />
    case 'Visitante': return <Users className="h-3.5 w-3.5" />
    case 'Residente': return <Building2 className="h-3.5 w-3.5" />
    case 'Seguridad': return <Shield className="h-3.5 w-3.5" />
    default: return null
  }
}

type Tab = 'personas' | 'reportes' | 'destinos' | 'categorias' | 'docs'

const tabs: { key: Tab; label: string; icon: typeof Tags }[] = [
  { key: 'personas', label: 'Personal', icon: UsersIcon },
  { key: 'reportes', label: 'Reporte', icon: FileText },
  { key: 'destinos', label: 'Destinos', icon: MapPin },
  { key: 'categorias', label: 'Categorías', icon: Tags },
  { key: 'docs', label: 'Docs', icon: FileSpreadsheet },
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
  const [searchQuery, setSearchQuery] = useState('')
  const [newPlaca, setNewPlaca] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [newCat, setNewCat] = useState('Empleado')
  const [newPersonaDestino, setNewPersonaDestino] = useState('')
  const [editPersona, setEditPersona] = useState<Persona | null>(null)
  const [editPlaca, setEditPlaca] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editCat, setEditCat] = useState('')
  const [editDestino, setEditDestino] = useState('')
  const categoriaOrder: Record<string, number> = { Residente: 0, Empleado: 1, Visitante: 2 }
  const [personalSubTab, setPersonalSubTab] = useState<'todos' | 'empleados' | 'visitantes' | 'residentes' | 'seguridad'>('todos')

  const catFilter = (st: string) => st === 'todos' ? true : st === 'empleados' ? 'empleado' : st === 'residentes' ? 'residente' : st === 'visitantes' ? 'visitante' : 'seguridad'
  const filteredPersonas = personas.filter((p) => {
    if (personalSubTab !== 'todos' && p.categoria.toLowerCase() !== catFilter(personalSubTab)) return false
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      if (!p.placa.toLowerCase().includes(q) && !p.nombre.toLowerCase().includes(q)) return false
    }
    return true
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

  const openEdit = (p: Persona) => {
    setEditPersona(p)
    setEditPlaca(p.placa)
    setEditNombre(p.nombre)
    setEditCat(p.categoria)
    setEditDestino(p.destino || '')
  }

  const saveEdit = async () => {
    if (!editPersona || !editPlaca.trim() || !editNombre.trim()) return
    try {
      const updated = await api.updatePersona(editPersona.id, {
        placa: editPlaca,
        nombre: editNombre,
        categoria: editCat,
        destino: editDestino,
      })
      setPersonas(personas.map((p) => (p.id === editPersona.id ? updated : p)))
      setEditPersona(null)
    } catch (err: any) {
      setMessage(err.message)
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
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por placa o nombre..."
              className="max-w-sm"
            />
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
            <div className="rounded-md border max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-5"></th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Placa</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoría</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Destino</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersonas.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5">{catIcon(p.categoria)}</td>
                      <td className="px-4 py-2.5 font-mono">{p.placa}</td>
                      <td className="px-4 py-2.5">{p.nombre}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.categoria}</span>
                      </td>
                      <td className="px-4 py-2.5">{p.destino || '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePersona(p.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredPersonas.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">Sin personas registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editPersona} onOpenChange={(o) => !o && setEditPersona(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar persona</DialogTitle>
            <DialogDescription>Modifique los datos de la persona.</DialogDescription>
          </DialogHeader>
          {editPersona && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1 col-span-2">
                <Label>Placa</Label>
                <Input value={editPlaca} onChange={(e) => setEditPlaca(e.target.value.toUpperCase())} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Nombre</Label>
                <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <select
                  value={editCat}
                  onChange={(e) => setEditCat(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {categorias.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Destino</Label>
                <select
                  value={editDestino}
                  onChange={(e) => setEditDestino(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Sin destino</option>
                  {destinos.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPersona(null)}>Cancelar</Button>
            <Button onClick={saveEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {tab === 'docs' && (
        <DocsSection />
      )}
    </div>
  )
}

function ReportesSection() {
  const today = () => new Date().toISOString().slice(0, 10)
  const [entries, setEntries] = useState<Entry[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')
  const [fechaDesde, setFechaDesde] = useState(today)
  const [fechaHasta, setFechaHasta] = useState(today)
  const [error, setError] = useState('')

  const cargar = async () => {
    setError('')
    try {
      const data = await api.getEntries({
        ...(categoriaFiltro && { categoria: categoriaFiltro }),
        desde: fechaDesde + 'T00:00:00',
        hasta: fechaHasta + 'T23:59:59',
      })
      setEntries(data)
    } catch (e: any) {
      setEntries([])
      setError(e.message || 'Error al cargar los registros')
    }
  }

  useEffect(() => {
    cargar()
  }, [])

  const generarPDF = () => {
    const doc = new jsPDF()

    doc.setFontSize(16)
    doc.text('REPORTE DE INGRESOS FINCA TENNIS', 105, 20, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`${fechaDesde} — ${fechaHasta}`, 105, 27, { align: 'center' })
    doc.setFontSize(8)
    let y = 33
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
    }

    const yStart = categoriaFiltro ? y + 6 : y + 6

    autoTable(doc, {
      startY: yStart,
      head: [['Placa', 'Nombre', 'Categoría', 'Destino', 'Ingreso', 'Salida']],
      body: entries.map((e) => [
        e.placa,
        e.nombre,
        e.categoria,
        e.destino,
        e.ingreso ? new Date(e.ingreso).toLocaleString('es-ES') : '—',
        e.salida ? new Date(e.salida).toLocaleString('es-ES') : '—',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [75, 85, 99], halign: 'center' },
    })

    doc.save(`reporte-${fechaDesde}-${fechaHasta}.pdf`)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Registro de ingresos y salidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Desde</label>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="h-9 w-44"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Hasta</label>
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="h-9 w-44"
            />
          </div>
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
          <Button onClick={cargar} size="sm" className="h-9">Buscar</Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={generarPDF} size="sm" variant="outline" className="h-9 ml-auto" disabled={entries.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
        </div>

        <div className="rounded-md border max-h-[400px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-5"></th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Placa</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoría</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Destino</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ingreso</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Salida</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">{catIcon(e.categoria)}</td>
                  <td className="px-4 py-2.5 font-mono">{e.placa}</td>
                  <td className="px-4 py-2.5">{e.nombre}</td>
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
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">Sin resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function DocsSection() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  useEffect(() => {
    api.listPersonas().then(setPersonas).catch(() => setPersonas([]))
  }, [])

  const filtered = categoriaFiltro
    ? personas.filter((p) => p.categoria === categoriaFiltro)
    : personas

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(16)
    doc.text('PERSONAL REGISTRADO - FINCA TENNIS', 148, 15, { align: 'center' })
    doc.setFontSize(8)
    doc.text(`Generado: ${new Date().toLocaleString()}${categoriaFiltro ? ` | Categoría: ${categoriaFiltro}` : ''}`, 148, 21, { align: 'center' })
    autoTable(doc, {
      startY: 25,
      head: [['Placa', 'Nombre', 'Categoría', 'Destino']],
      body: filtered.map((p) => [
        p.placa,
        p.nombre,
        p.categoria,
        p.destino || '—',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [75, 85, 99], halign: 'center' },
    })
    doc.save(`personal${categoriaFiltro ? `-${categoriaFiltro}` : ''}.pdf`)
  }

  const exportXLSX = () => {
    const data = filtered.map((p) => ({
      Placa: p.placa,
      Nombre: p.nombre,
      Categoría: p.categoria,
      Destino: p.destino || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Personal')
    XLSX.writeFile(wb, `personal${categoriaFiltro ? `-${categoriaFiltro}` : ''}.xlsx`)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Documentos</CardTitle>
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
              <option value="Seguridad">Seguridad</option>
            </select>
          </div>
          <Button onClick={exportPDF} size="sm" variant="outline" className="h-9" disabled={filtered.length === 0}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
          <Button onClick={exportXLSX} size="sm" variant="outline" className="h-9" disabled={filtered.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            XLSX
          </Button>
        </div>
        <div className="rounded-md border max-h-[400px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-5"></th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Placa</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Categoría</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Destino</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5">{catIcon(p.categoria)}</td>
                  <td className="px-4 py-2.5 font-mono">{p.placa}</td>
                  <td className="px-4 py-2.5">{p.nombre}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{p.categoria}</span>
                  </td>
                  <td className="px-4 py-2.5">{p.destino || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">Sin personas registradas</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
