import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { api, type Persona, type Entry } from '@/lib/api'
import { ArrowLeftToLine, Loader2, UserCheck } from 'lucide-react'

export default function ResidentesPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [entryMap, setEntryMap] = useState<Record<string, Entry>>({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [modalPersona, setModalPersona] = useState<Persona | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [allPersonas, sinIngreso] = await Promise.all([
        api.listPersonas(),
        api.getEntries({ categoria: 'Residente', sin_ingreso: true }),
      ])
      const residentes = allPersonas.filter((p) => p.categoria === 'Residente')
      const fuera = new Set<string>()
      const em: Record<string, Entry> = {}
      for (const e of sinIngreso) {
        fuera.add(e.placa)
        em[e.placa] = e
      }
      setEntryMap(em)
      setPersonas(residentes.filter((p) => fuera.has(p.placa)))
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const confirmarIngreso = async () => {
    if (!modalPersona) return
    setToggling(modalPersona.id)
    setModalPersona(null)
    try {
      await api.registrarIngresoResidente(modalPersona.placa)
      setPersonas((prev) => prev.filter((p) => p.id !== modalPersona.id))
    } catch {}
    setToggling(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Residentes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Residentes fuera de la finca</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground text-sm px-6 pb-6">Cargando...</p>
          ) : personas.length === 0 ? (
            <p className="text-muted-foreground text-sm px-6 pb-6">Todos los residentes están en la finca</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Placa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destino</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salida</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registró</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {personas.map((p) => {
                    const busy = toggling === p.id
                    return (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm">{p.placa}</td>
                        <td className="px-4 py-3 text-sm">{entryMap[p.placa]?.nombre || p.nombre}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.destino}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{entryMap[p.placa]?.salida ? new Date(entryMap[p.placa].salida!).toLocaleString('es-ES') : '—'}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{entryMap[p.placa]?.responsable || '—'}</td>
                        <td className="px-4 py-3">
                          <Button onClick={() => setModalPersona(p)} disabled={busy} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ArrowLeftToLine className="h-4 w-4 mr-1.5" />
                                Ingreso
                              </>
                            )}
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!modalPersona} onOpenChange={(o) => !o && setModalPersona(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar ingreso de residente</DialogTitle>
            <DialogDescription>
              Confirme el ingreso del residente a la finca.
            </DialogDescription>
          </DialogHeader>
          {modalPersona && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span className="font-medium text-foreground">{modalPersona.placa}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Nombre: </span>
                <span className="font-medium">{modalPersona.nombre}</span>
              </div>
              {modalPersona.destino && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Destino: </span>
                  <span className="font-medium">{modalPersona.destino}</span>
                </div>
              )}
              <div className="text-sm">
                <span className="text-muted-foreground">Salida: </span>
                <span className="font-medium">{entryMap[modalPersona.placa]?.salida ? new Date(entryMap[modalPersona.placa].salida!).toLocaleString('es-ES') : '—'}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Registró: </span>
                <span className="font-medium">{entryMap[modalPersona.placa]?.responsable || '—'}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPersona(null)}>Cancelar</Button>
            <Button onClick={confirmarIngreso} className="bg-green-600 hover:bg-green-700 text-white">
              <ArrowLeftToLine className="h-4 w-4 mr-1.5" />
              Confirmar ingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
