import type { ReactNode } from 'react'
import type { Rival, Torneo } from '../db/schema'
import type { FiltrosPartidos } from '../lib/historial'
import { etiquetaTorneo } from '../lib/torneo'
import Campo from './Campo'
import { claseCampo } from './estilos'

interface Props {
  filtros: FiltrosPartidos
  onChange: (cambios: Partial<FiltrosPartidos>) => void
  rivales: Rival[]
  torneos: Torneo[]
  anios: string[]
}

export default function PanelFiltros({ filtros, onChange, rivales, torneos, anios }: Props) {
  const select = (etiqueta: string, valor: string, cambiar: (v: string) => void, opciones: ReactNode) => (
    <Campo etiqueta={etiqueta}>
      {(props) => (
        <select {...props} value={valor} onChange={(e) => cambiar(e.target.value)} className={`${claseCampo} w-full`}>
          {opciones}
        </select>
      )}
    </Campo>
  )

  return (
    <div className="grid grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <div className="col-span-2">
        {select(
          'Rival',
          filtros.rivalId,
          (rivalId) => onChange({ rivalId }),
          <>
            <option value="">Todos</option>
            {rivales.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </>,
        )}
      </div>
      {select(
        'Tipo',
        filtros.tipo,
        (tipo) => onChange({ tipo: tipo as FiltrosPartidos['tipo'] }),
        <>
          <option value="">Todos</option>
          <option value="amistoso">Amistoso</option>
          <option value="torneo">Torneo</option>
        </>,
      )}
      {select(
        'Resultado',
        filtros.resultado,
        (resultado) => onChange({ resultado: resultado as FiltrosPartidos['resultado'] }),
        <>
          <option value="">Todos</option>
          <option value="ganado">Victorias</option>
          <option value="perdido">Derrotas</option>
          <option value="sin_resultado">Sin resultado</option>
        </>,
      )}
      <div className="col-span-2">
        {select(
          'Torneo',
          filtros.torneoId,
          (torneoId) => onChange({ torneoId }),
          <>
            <option value="">Todos</option>
            {torneos.map((t) => (
              <option key={t.id} value={t.id}>
                {etiquetaTorneo(t)}
              </option>
            ))}
          </>,
        )}
      </div>
      {select(
        'Año',
        filtros.anio,
        (anio) => onChange({ anio }),
        <>
          <option value="">Todos</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </>,
      )}
    </div>
  )
}
