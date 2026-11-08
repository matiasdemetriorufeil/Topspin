import type { ID, Partido } from '../db/schema'
import { detalleSets, marcadorSets, resultadoPartido } from './resultado'
import { normalizar } from './texto'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

/** '2026-10' → 'Octubre 2026' */
export function tituloMes(anioMes: string): string {
  const [anio, mes] = anioMes.split('-')
  return `${MESES[Number(mes) - 1]} ${anio}`
}

/** Más recientes primero: por fecha y, el mismo día, por orden de carga. */
export function ordenarRecientes(partidos: Partido[]): Partido[] {
  return [...partidos].sort((a, b) =>
    a.fecha === b.fecha ? b.creadoEn.localeCompare(a.creadoEn) : b.fecha.localeCompare(a.fecha),
  )
}

export interface GrupoMes {
  clave: string // 'yyyy-mm'
  titulo: string
  partidos: Partido[]
}

/** Agrupa por mes conservando el orden recibido. */
export function agruparPorMes(partidos: Partido[]): GrupoMes[] {
  const grupos: GrupoMes[] = []
  for (const p of partidos) {
    const clave = p.fecha.slice(0, 7)
    let grupo = grupos[grupos.length - 1]
    if (grupo?.clave !== clave) {
      grupo = { clave, titulo: tituloMes(clave), partidos: [] }
      grupos.push(grupo)
    }
    grupo.partidos.push(p)
  }
  return grupos
}

/** "6-4 3-6 7-6(5)" si hay games cargados, "2-1 en sets" si no, '' si no hay sets. */
export function marcadorPartido(p: Pick<Partido, 'sets'>): string {
  if (p.sets.length === 0) return ''
  const hayGames = p.sets.some((s) => s.misGames !== undefined && s.susGames !== undefined)
  return hayGames ? detalleSets(p.sets) : `${marcadorSets(p.sets)} en sets`
}

/** Etiqueta para estados especiales; null si el partido se completó normalmente. */
export function etiquetaEstado(p: Pick<Partido, 'estado' | 'retiroDe'>): string | null {
  switch (p.estado) {
    case 'wo_ganado':
    case 'wo_perdido':
      return 'WO'
    case 'suspendido':
      return 'Suspendido'
    case 'retiro':
      return p.retiroDe === 'yo' ? 'Me retiré' : p.retiroDe === 'rival' ? 'Retiro del rival' : 'Retiro'
    case 'completado':
      return null
  }
}

export type FiltroResultado = '' | 'ganado' | 'perdido' | 'sin_resultado'

export interface FiltrosPartidos {
  busqueda: string
  rivalId: ID | ''
  tipo: '' | Partido['tipo']
  torneoId: ID | ''
  resultado: FiltroResultado
  anio: string
}

export const FILTROS_VACIOS: FiltrosPartidos = {
  busqueda: '',
  rivalId: '',
  tipo: '',
  torneoId: '',
  resultado: '',
  anio: '',
}

export function filtrarPartidos(
  partidos: Partido[],
  f: FiltrosPartidos,
  nombreRival: (id: ID) => string | undefined,
): Partido[] {
  const q = normalizar(f.busqueda)
  return partidos.filter((p) => {
    if (f.rivalId && p.rivalId !== f.rivalId) return false
    if (f.tipo && p.tipo !== f.tipo) return false
    if (f.torneoId && p.torneoId !== f.torneoId) return false
    if (f.anio && !p.fecha.startsWith(`${f.anio}-`)) return false
    if (f.resultado) {
      const r = resultadoPartido(p)
      if (f.resultado === 'sin_resultado' ? r !== null : r !== f.resultado) return false
    }
    if (q && !normalizar(nombreRival(p.rivalId) ?? '').includes(q)) return false
    return true
  })
}

/** Filtros del panel que están en uso (la búsqueda va aparte, siempre visible). */
export function contarFiltrosActivos(f: FiltrosPartidos): number {
  return [f.rivalId, f.tipo, f.torneoId, f.resultado, f.anio].filter(Boolean).length
}

/** Años con partidos, del más reciente al más viejo. */
export function aniosConPartidos(partidos: Pick<Partido, 'fecha'>[]): string[] {
  return [...new Set(partidos.map((p) => p.fecha.slice(0, 4)))].sort().reverse()
}

// Los filtros viven en la URL para que se conserven al ir al detalle y volver
const PARAMS: Record<keyof FiltrosPartidos, string> = {
  busqueda: 'q',
  rivalId: 'rival',
  tipo: 'tipo',
  torneoId: 'torneo',
  resultado: 'resultado',
  anio: 'anio',
}

export function filtrosDesdeParams(params: URLSearchParams): FiltrosPartidos {
  const leer = (k: keyof FiltrosPartidos) => params.get(PARAMS[k]) ?? ''
  const tipo = leer('tipo')
  const resultado = leer('resultado')
  const anio = leer('anio')
  return {
    busqueda: leer('busqueda'),
    rivalId: leer('rivalId'),
    tipo: tipo === 'amistoso' || tipo === 'torneo' ? tipo : '',
    torneoId: leer('torneoId'),
    resultado: ['ganado', 'perdido', 'sin_resultado'].includes(resultado) ? (resultado as FiltroResultado) : '',
    anio: /^\d{4}$/.test(anio) ? anio : '',
  }
}

export function paramsDesdeFiltros(f: FiltrosPartidos): URLSearchParams {
  const params = new URLSearchParams()
  for (const k of Object.keys(PARAMS) as (keyof FiltrosPartidos)[]) {
    if (f[k]) params.set(PARAMS[k], f[k])
  }
  return params
}
