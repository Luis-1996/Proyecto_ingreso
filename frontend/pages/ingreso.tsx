import { useState, useRef, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { api, type Persona, type Entry } from '@/lib/api'
import {
  Search,
  UserCheck,
  Users,
  Building2,
  Shield,
  ArrowRightFromLine,
  ArrowLeftToLine,
  Loader2,
  Plus,
} from 'lucide-react'

export default function IngresoPage() {
  const [query, setQuery] = useState('')
  const [personas, setPersonas] = useState<Persona[]>([])
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<Persona | null>(null)
  const [action, setAction] = useState<{ accion: string; entry: Entry } | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [newPlaca, setNewPlaca] = useState('')
  const [newNombre, setNewNombre] = useState('')
  const [newCat, setNewCat] = useState('Empleado')
  const [catOptions, setCatOptions] = useState<string[]>([])
  const [destOptions, setDestOptions] = useState<string[]>([])
  const [newDestino, setNewDestino] = useState('')
  const [saving, setSaving] = useState(false)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editPersona, setEditPersona] = useState<Persona | null>(null)
  const [editPlaca, setEditPlaca] = useState('')
  const [editNombre, setEditNombre] = useState('')
  const [editCat, setEditCat] = useState('')
  const [editDestino, setEditDestino] = useState('')
  const [editResponsable, setEditResponsable] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    inputRef.current?.focus()
    api.getConfig('categorias').then((c) => setCatOptions(c.value)).catch(() => {})
    api.getConfig('destinos').then((d) => setDestOptions(d.value)).catch(() => {})
  }, [])

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setPersonas([])
      setSearched(false)
      return
    }
    setSearching(true)
    setError('')
    setSelected(null)
    setAction(null)
    try {
      const results = await api.searchPersonas(q)
      setPersonas(results)
      setSearched(true)
    } catch {
      setError('Error al buscar')
    } finally {
      setSearching(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelected(null)
    setAction(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(value), 250)
  }

  const handleRegister = async (persona: Persona, overrides?: { nombre?: string; categoria?: string; destino?: string }) => {
    setSelected(persona)
    setLoading(true)
    setError('')
    setAction(null)
    try {
      const result = await api.ingresoAutomatico(persona.placa, overrides)
      setAction(result)
      setQuery('')
      setPersonas([])
      setSearched(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditModal = (persona: Persona) => {
    setEditPersona(persona)
    setEditPlaca(persona.placa)
    setEditNombre(persona.nombre)
    setEditCat(persona.categoria)
    setEditDestino(persona.destino)
    setEditModalOpen(true)
  }

  const handleConfirmEdit = async () => {
    if (!editPersona) return
    setEditModalOpen(false)
    await handleRegister(editPersona, {
      nombre: editNombre,
      categoria: editCat,
      destino: editDestino,
      responsable: editResponsable,
    })
  }

  const openModal = () => {
    setNewPlaca(query)
    setNewNombre('')
    setNewCat(catOptions[0] || 'Empleado')
    setNewDestino(destOptions[0] || '')
    setModalOpen(true)
  }

  const handleSavePersona = async () => {
    if (!newPlaca.trim() || !newNombre.trim()) return
    setSaving(true)
    try {
      const p = await api.createPersona({ placa: newPlaca, nombre: newNombre, categoria: newCat, destino: newDestino })
      setModalOpen(false)
      setQuery(p.placa)
      setPersonas([p])
      setSearched(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const notFound = searched && personas.length === 0 && query.trim()

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case 'Empleado': return <UserCheck className="h-4 w-4" />
      case 'Visitante': return <Users className="h-4 w-4" />
      case 'Residente': return <Building2 className="h-4 w-4" />
      case 'Seguridad': return <Shield className="h-4 w-4" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Ingreso</h1>

      <Card>
        <CardHeader>
          <CardTitle>Buscar persona o placa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Buscar por placa o nombre..."
                className="pr-10"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            {notFound && (
              <Button onClick={openModal} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                No encontrada
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {personas.length > 1 && !selected && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Seleccione una persona:
              </p>
              {personas.map((p) => (
                  <button
                  key={p.id}
                  onClick={() => (p.categoria === 'Residente' || p.categoria === 'Visitante') ? handleOpenEditModal(p) : handleRegister(p)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md border bg-card hover:bg-accent transition-colors text-left disabled:opacity-50"
                >
                  {categoryIcon(p.categoria)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{p.placa} · {p.categoria}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {personas.length === 1 && !selected && (
            <div className="flex items-center gap-3 p-4 rounded-md border bg-card">
              {categoryIcon(personas[0].categoria)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{personas[0].nombre}</p>
                <p className="text-xs text-muted-foreground">{personas[0].placa} · {personas[0].categoria}</p>
              </div>
              <Button
                onClick={() => (personas[0].categoria === 'Residente' || personas[0].categoria === 'Visitante') ? handleOpenEditModal(personas[0]) : handleRegister(personas[0])}
                disabled={loading}
                className={personas[0].categoria === 'Residente' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : personas[0].categoria === 'Residente' ? (
                  <>
                    <ArrowRightFromLine className="h-4 w-4 mr-2" />
                    Registrar Salida
                  </>
                ) : (
                  <>
                    <ArrowLeftToLine className="h-4 w-4 mr-2" />
                    Registrar Ingreso
                  </>
                )}
              </Button>
            </div>
          )}

          {action && (
            <div className={`flex items-center gap-3 p-4 rounded-md border ${
              action.accion === 'ingreso' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
            }`}>
              {action.accion === 'ingreso' ? (
                <ArrowLeftToLine className="h-5 w-5 text-green-600" />
              ) : (
                <ArrowRightFromLine className="h-5 w-5 text-orange-600" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {action.accion === 'ingreso' ? 'Ingreso registrado' : 'Salida registrada'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {action.entry.nombre} · {action.entry.placa}
                </p>
              </div>
            </div>
          )}

          {notFound && (
            <p className="text-sm text-muted-foreground">
              La placa o persona no está registrada. Presione <strong>&ldquo;No encontrada&rdquo;</strong> para agregarla.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar nueva persona</DialogTitle>
            <DialogDescription>
              Complete los datos para registrar la placa en el sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="modal-placa">Placa</Label>
              <Input
                id="modal-placa"
                value={newPlaca}
                onChange={(e) => setNewPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-nombre">Nombre</Label>
              <Input
                id="modal-nombre"
                value={newNombre}
                onChange={(e) => setNewNombre(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-cat">Categoría</Label>
              <select
                id="modal-cat"
                value={newCat}
                onChange={(e) => setNewCat(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {catOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-destino">Destino</Label>
              <select
                id="modal-destino"
                value={newDestino}
                onChange={(e) => setNewDestino(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                {destOptions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePersona} disabled={saving || !newPlaca.trim() || !newNombre.trim()}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editCat === 'Residente' ? 'Registrar Salida' : 'Registrar Ingreso'}
            </DialogTitle>
            <DialogDescription>
              {editCat === 'Residente'
                ? 'Confirme los datos de la persona que sale. Los campos son editables y no modifican el registro original.'
                : 'Confirme los datos de la persona que ingresa. Los campos son editables y no modifican el registro original.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-placa">Placa</Label>
              <Input
                id="edit-placa"
                value={editPlaca}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre</Label>
              <Input
                id="edit-nombre"
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat">Categoría</Label>
              <Input
                id="edit-cat"
                value={editCat}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-destino">Destino</Label>
              <Input
                id="edit-destino"
                value={editDestino}
                onChange={(e) => setEditDestino(e.target.value)}
                disabled={editCat === 'Residente'}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-responsable">Registrado por</Label>
              <Input
                id="edit-responsable"
                value={editResponsable}
                onChange={(e) => setEditResponsable(e.target.value)}
                placeholder="Nombre de quien registra"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleConfirmEdit}
              className={editCat === 'Residente' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}
            >
              {editCat === 'Residente' ? 'Confirmar Salida' : 'Confirmar Ingreso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
