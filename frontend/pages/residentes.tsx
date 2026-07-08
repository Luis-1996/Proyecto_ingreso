import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api, type Persona, type Entry } from '@/lib/api'
import { ArrowLeftToLine, Loader2 } from 'lucide-react'

export default function ResidentesPage() {
  const [personas, setPersonas] = useState<Persona[]>([])
  const [entryMap, setEntryMap] = useState<Record<string, Entry>>({})
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)

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

  const confirmarIngreso = async (persona: Persona) => {
    setToggling(persona.id)
    try {
      await api.registrarIngresoResidente(persona.placa)
      setPersonas((prev) => prev.filter((p) => p.id !== persona.id))
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
                        <td className="px-4 py-3">
                          <Button onClick={() => confirmarIngreso(p)} disabled={busy} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
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
    </div>
  )
}
