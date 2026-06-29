import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { api, type Entry } from '@/lib/api'

interface Props {
  categoria?: string
}

export default function EntryList({ categoria }: Props) {
  const [entries, setEntries] = useState<Entry[]>([])

  const fetchEntries = () => {
    api.getEntries({ activo: true, categoria }).then(setEntries).catch(() => {})
  }

  const handleSalida = async (id: string) => {
    try {
      await api.registerSalida(id)
      fetchEntries()
    } catch {}
  }

  useEffect(() => {
    fetchEntries()
  }, [categoria])

  const formatDate = (dateStr: string | null) =>
    dateStr ? new Date(dateStr).toLocaleString('es-MX') : '—'

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingresos Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No hay ingresos activos</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos Activos</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Placa</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Categoría</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Destino</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ingreso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{entry.placa}</td>
                  <td className="px-4 py-3 text-sm">{entry.nombre}</td>
                  <td className="px-4 py-3 text-sm">{entry.categoria}</td>
                  <td className="px-4 py-3 text-sm">{entry.destino}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(entry.ingreso)}</td>
                  <td className="px-4 py-3">
                    <Button variant="destructive" size="sm" onClick={() => handleSalida(entry.id)}>
                      Salida
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
