import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api, type Entry } from '@/lib/api'

export default function Page({ title, categorias }: { title: string; categorias: string[] }) {
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    Promise.all(
      categorias.map((cat) => api.getEntries({ activo: true, categoria: cat }))
    )
      .then((results) => setEntries(results.flat()))
      .catch(() => {})
  }, [categorias])

  const handleSalida = async (id: string) => {
    try {
      await api.registerSalida(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch {}
  }

  const formatDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleString('es-MX') : '—'

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{title} Dentro De La Finca</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm px-6 pb-6">No hay registros</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Placa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destino</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Hora Ingreso</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm">{entry.placa}</td>
                      <td className="px-4 py-3 text-sm">{entry.nombre}</td>
                      <td className="px-4 py-3 text-sm">{entry.destino}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(entry.ingreso)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleSalida(entry.id)}
                          className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Salida
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
