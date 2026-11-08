import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { VENTANA_MOVIL, type PuntoEvolucion } from '../../lib/estadisticas'
import { formatearFecha } from '../../lib/fechas'
import { formatearPorcentaje } from '../../lib/formato'
import { CajaTooltip, Leyenda } from './piezas'

const ACUMULADO = 'var(--viz-serie-1)'
const MOVIL = 'var(--viz-serie-2)'
const eje = { fill: 'var(--viz-eje)', fontSize: 11 }
const puntoActivo = { r: 4, stroke: 'var(--viz-superficie)', strokeWidth: 2 }

export default function GraficoEvolucion({ puntos }: { puntos: PuntoEvolucion[] }) {
  if (puntos.length < 2) {
    return <p className="text-sm text-stone-500 dark:text-stone-400">Hacen falta al menos 2 partidos para ver la evolución.</p>
  }

  const ultimo = puntos[puntos.length - 1]
  const hayMovil = ultimo.movil !== null
  const resumen = `Evolución en ${puntos.length} partidos: ${formatearPorcentaje(ultimo.acumulado)} acumulado${
    hayMovil ? `, ${formatearPorcentaje(ultimo.movil)} en los últimos ${VENTANA_MOVIL}` : ''
  }.`

  return (
    <>
      <Leyenda
        items={[
          { color: ACUMULADO, etiqueta: 'Acumulado', forma: 'linea' },
          { color: MOVIL, etiqueta: `Últimos ${VENTANA_MOVIL}`, forma: 'linea' },
        ]}
      />
      <div role="img" aria-label={resumen}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={puntos} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grilla)" />
            <XAxis
              dataKey="numero"
              type="number"
              domain={[1, 'dataMax']}
              allowDecimals={false}
              tick={eje}
              tickLine={false}
              axisLine={{ stroke: 'var(--viz-grilla)' }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={eje}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: 'var(--viz-eje)', strokeWidth: 1 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as PuntoEvolucion | undefined
                if (!active || !p) return null
                return (
                  <CajaTooltip
                    titulo={`Partido ${p.numero} · ${formatearFecha(p.fecha)}`}
                    filas={[
                      { color: ACUMULADO, etiqueta: 'Acumulado', valor: formatearPorcentaje(p.acumulado) },
                      ...(p.movil !== null
                        ? [{ color: MOVIL, etiqueta: `Últimos ${VENTANA_MOVIL}`, valor: formatearPorcentaje(p.movil) }]
                        : []),
                    ]}
                  />
                )
              }}
            />
            <Line
              dataKey="acumulado"
              type="monotone"
              stroke={ACUMULADO}
              strokeWidth={2}
              dot={false}
              activeDot={puntoActivo}
              isAnimationActive={false}
            />
            <Line
              dataKey="movil"
              type="monotone"
              stroke={MOVIL}
              strokeWidth={2}
              dot={false}
              activeDot={puntoActivo}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        Hoy: {formatearPorcentaje(ultimo.acumulado)} acumulado
        {hayMovil
          ? ` · ${formatearPorcentaje(ultimo.movil)} en los últimos ${VENTANA_MOVIL}`
          : ` · la línea de los últimos ${VENTANA_MOVIL} aparece desde el partido ${VENTANA_MOVIL}`}
      </p>
    </>
  )
}
