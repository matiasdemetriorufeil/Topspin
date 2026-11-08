import type { ID, Partido, Torneo } from '../db/schema'
import { ordenarCronologico } from './estadisticas'
import { formatearFecha } from './fechas'
import { marcadorPartido } from './historial'
import { ESTADOS } from './partido'
import { marcadorSets, resultadoPartido } from './resultado'

/*
 * Separador ";" porque Excel en español (coma decimal) espera ";" para abrir el
 * CSV en columnas. El BOM hace que Excel lea bien las tildes y la ñ en UTF-8.
 * Numbers abre los dos sin problemas.
 */
const SEPARADOR = ';'
const BOM = String.fromCharCode(0xfeff)

function celda(valor: string | number | undefined): string {
  const texto = valor === undefined ? '' : String(valor)
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Excel toma "6-4" o "2-1" como fechas; con guion medio ("6–4") los deja como texto. */
const marcadorTexto = (m: string) => m.replace(/-/g, '–')

const ENCABEZADO = ['Fecha', 'Rival', 'Club', 'Tipo', 'Torneo', 'Ronda', 'Estado', 'Resultado', 'Sets', 'Marcador', 'Notas']

/** Partidos en orden cronológico, una fila por partido. */
export function partidosACsv(
  partidos: Partido[],
  nombres: { rivales: Map<ID, string>; clubes: Map<ID, string>; torneos: Map<ID, Torneo> },
): string {
  const filas = ordenarCronologico(partidos).map((p) => {
    const r = resultadoPartido(p)
    return [
      formatearFecha(p.fecha),
      nombres.rivales.get(p.rivalId),
      nombres.clubes.get(p.clubId),
      p.tipo === 'torneo' ? 'Torneo' : 'Amistoso',
      p.torneoId ? nombres.torneos.get(p.torneoId)?.nombre : undefined,
      p.ronda,
      ESTADOS.find((e) => e.valor === p.estado)?.etiqueta,
      r === 'ganado' ? 'Victoria' : r === 'perdido' ? 'Derrota' : '',
      p.sets.length ? marcadorTexto(marcadorSets(p.sets)) : '',
      p.sets.some((s) => s.misGames !== undefined) ? marcadorTexto(marcadorPartido(p)) : '',
      p.notas,
    ]
  })
  return BOM + [ENCABEZADO, ...filas].map((f) => f.map(celda).join(SEPARADOR)).join('\r\n') + '\r\n'
}
