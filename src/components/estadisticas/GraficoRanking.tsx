import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatearFecha } from '../../lib/fechas'
import { formatearDelta, formatearPuntaje } from '../../lib/formato'
import { PUNTAJE_INICIAL } from '../../lib/ranking'
import { CajaTooltip } from './piezas'

export interface PuntoGraficoRanking {
  /** Número de partido en todo el historial (no se reinicia con el período) */
  numero: number
  fecha: string
  puntaje: number
  delta: number
}

const SERIE = 'var(--viz-serie-1)'
const eje = { fill: 'var(--viz-eje)', fontSize: 11 }

/**
 * Eje Y con margen, en múltiplos de un paso redondo (50, 100, 200…) para que
 * la línea no toque los bordes y las marcas queden parejas.
 */
function ejeY(puntos: PuntoGraficoRanking[]): { dominio: [number, number]; marcas: number[] } {
  const valores = [...puntos.map((p) => p.puntaje), PUNTAJE_INICIAL]
  const min = Math.min(...valores) - 10
  const max = Math.max(...valores) + 10
  const paso = [50, 100, 200, 500].find((p) => (max - min) / p <= 5) ?? 1000
  const desde = Math.floor(min / paso) * paso
  const hasta = Math.ceil(max / paso) * paso
  const marcas: number[] = []
  for (let v = desde; v <= hasta; v += paso) marcas.push(v)
  return { dominio: [desde, hasta], marcas }
}

export default function GraficoRanking({ puntos }: { puntos: PuntoGraficoRanking[] }) {
  if (puntos.length < 2) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Hacen falta al menos 2 partidos en el período para ver la evolución.</p>
  }

  const primero = puntos[0]
  const ultimo = puntos[puntos.length - 1]
  const variacion = ultimo.puntaje - (primero.puntaje - primero.delta)
  const y = ejeY(puntos)

  return (
    <>
      {/* Una sola serie: el título del bloque la nombra, no hace falta leyenda */}
      <div role="img" aria-label={`Ranking de ${formatearPuntaje(primero.puntaje - primero.delta)} a ${formatearPuntaje(ultimo.puntaje)} en el período.`}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={puntos} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grilla)" />
            <XAxis
              dataKey="numero"
              type="number"
              domain={['dataMin', 'dataMax']}
              allowDecimals={false}
              tick={eje}
              tickLine={false}
              axisLine={{ stroke: 'var(--viz-grilla)' }}
            />
            <YAxis domain={y.dominio} ticks={y.marcas} allowDecimals={false} tick={eje} tickLine={false} axisLine={false} width={44} />
            <ReferenceLine
              y={PUNTAJE_INICIAL}
              stroke="var(--viz-eje)"
              strokeOpacity={0.5}
              label={{ value: 'Inicio 1500', position: 'insideBottomLeft', fill: 'var(--viz-eje)', fontSize: 10 }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--viz-eje)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as PuntoGraficoRanking | undefined
                if (!active || !p) return null
                return (
                  <CajaTooltip
                    titulo={`Partido ${p.numero} · ${formatearFecha(p.fecha)}`}
                    filas={[
                      { color: SERIE, etiqueta: 'Ranking', valor: formatearPuntaje(p.puntaje) },
                      { color: 'transparent', etiqueta: 'Variación', valor: formatearDelta(p.delta) },
                    ]}
                  />
                )
              }}
            />
            <Line
              dataKey="puntaje"
              type="monotone"
              stroke={SERIE}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--viz-superficie)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        En el período: {formatearDelta(variacion)} en {puntos.length} partidos
      </p>
    </>
  )
}
