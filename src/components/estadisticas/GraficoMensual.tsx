import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Mes } from '../../lib/estadisticas'
import { etiquetaMesCorta } from '../../lib/periodo'
import { CajaTooltip, Leyenda, VerTabla } from './piezas'

const GANADO = 'var(--viz-ganado)'
const PERDIDO = 'var(--viz-perdido)'
const eje = { fill: 'var(--viz-eje)', fontSize: 11 }

interface PropsSegmento {
  x?: number
  y?: number
  width?: number
  height?: number
  fill?: string
  payload?: Mes
}

/**
 * Segmento de barra apilada: esquinas redondeadas (4px) solo en el extremo de
 * arriba de la pila, cuadrado en la base, y 2px de aire entre ganados y perdidos.
 */
function Segmento({ x = 0, y = 0, width: w = 0, height: h = 0, fill, payload, serie }: PropsSegmento & { serie: 'ganados' | 'perdidos' }) {
  const hayArriba = serie === 'ganados' && (payload?.perdidos ?? 0) > 0
  if (hayArriba) {
    y += 2
    h -= 2
  }
  if (h <= 0 || w <= 0) return null
  const r = hayArriba ? 0 : Math.min(4, w / 2, h)
  const d = `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
  return <path d={d} fill={fill} />
}

export default function GraficoMensual({ meses }: { meses: Mes[] }) {
  const total = meses.reduce((n, m) => n + m.ganados + m.perdidos, 0)
  return (
    <>
      <Leyenda
        items={[
          { color: GANADO, etiqueta: 'Ganados' },
          { color: PERDIDO, etiqueta: 'Perdidos' },
        ]}
      />
      <div role="img" aria-label={`Partidos por mes: ${total} en ${meses.length} meses. El detalle está en la tabla.`}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={meses} margin={{ top: 8, right: 0, left: -20, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid vertical={false} stroke="var(--viz-grilla)" />
            <XAxis
              dataKey="mes"
              tickFormatter={etiquetaMesCorta}
              tick={eje}
              tickLine={false}
              axisLine={{ stroke: 'var(--viz-grilla)' }}
              interval="preserveStartEnd"
              minTickGap={2}
            />
            <YAxis allowDecimals={false} tick={eje} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ fill: 'var(--viz-grilla)', fillOpacity: 0.6 }}
              content={({ active, payload }) => {
                const m = payload?.[0]?.payload as Mes | undefined
                if (!active || !m) return null
                return (
                  <CajaTooltip
                    titulo={m.titulo}
                    filas={[
                      { color: GANADO, etiqueta: 'Ganados', valor: String(m.ganados) },
                      { color: PERDIDO, etiqueta: 'Perdidos', valor: String(m.perdidos) },
                    ]}
                  />
                )
              }}
            />
            <Bar
              dataKey="ganados"
              stackId="mes"
              fill={GANADO}
              maxBarSize={24}
              shape={(p: unknown) => <Segmento {...(p as PropsSegmento)} serie="ganados" />}
            />
            <Bar
              dataKey="perdidos"
              stackId="mes"
              fill={PERDIDO}
              maxBarSize={24}
              shape={(p: unknown) => <Segmento {...(p as PropsSegmento)} serie="perdidos" />}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <VerTabla>
        <table className="w-full tabular-nums">
          <thead className="text-left text-stone-500 dark:text-stone-400">
            <tr>
              <th className="py-1 font-medium">Mes</th>
              <th className="py-1 text-right font-medium">Ganados</th>
              <th className="py-1 text-right font-medium">Perdidos</th>
            </tr>
          </thead>
          <tbody>
            {meses.map((m) => (
              <tr key={m.mes} className="border-t border-stone-100 dark:border-stone-800">
                <td className="py-1">{m.titulo}</td>
                <td className="py-1 text-right">{m.ganados}</td>
                <td className="py-1 text-right">{m.perdidos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </VerTabla>
    </>
  )
}
