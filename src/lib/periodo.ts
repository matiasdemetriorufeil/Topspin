import type { Partido } from '../db/schema'

/** '12m' (últimos 12 meses), 'actual' (año en curso), 'todo' o un año 'yyyy'. */
export type Periodo = string

export const PERIODO_POR_DEFECTO: Periodo = '12m'

export interface Rango {
  /** yyyy-mm-dd, inclusive */
  desde?: string
  hasta?: string
  /** yyyy-mm, para completar el eje del gráfico mensual */
  mesDesde?: string
  mesHasta?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Acepta solo valores conocidos; cualquier otra cosa vuelve al período por defecto. */
export function leerPeriodo(valor: string | null): Periodo {
  if (valor === '12m' || valor === 'actual' || valor === 'todo' || (valor && /^\d{4}$/.test(valor))) return valor
  return PERIODO_POR_DEFECTO
}

/**
 * Rango de fechas del período.
 * "Últimos 12 meses" = el mes en curso y los 11 anteriores, completos
 * (así el gráfico mensual siempre tiene 12 barras).
 */
export function rangoPeriodo(periodo: Periodo, hoy: string): Rango {
  const anio = Number(hoy.slice(0, 4))
  const mes = Number(hoy.slice(5, 7))
  const mesHoy = hoy.slice(0, 7)
  switch (periodo) {
    case 'todo':
      return {}
    case 'actual':
      return { desde: `${anio}-01-01`, hasta: hoy, mesDesde: `${anio}-01`, mesHasta: mesHoy }
    case '12m': {
      const total = anio * 12 + (mes - 1) - 11
      const mesDesde = `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
      return { desde: `${mesDesde}-01`, hasta: hoy, mesDesde, mesHasta: mesHoy }
    }
    default:
      return { desde: `${periodo}-01-01`, hasta: `${periodo}-12-31`, mesDesde: `${periodo}-01`, mesHasta: `${periodo}-12` }
  }
}

export function filtrarPorRango<T extends Pick<Partido, 'fecha'>>(partidos: T[], rango: Rango): T[] {
  return partidos.filter(
    (p) => (!rango.desde || p.fecha >= rango.desde) && (!rango.hasta || p.fecha <= rango.hasta),
  )
}

/**
 * Opciones del selector: últimos 12 meses, año actual, cada año anterior con
 * partidos (más reciente primero) y todo.
 */
export function opcionesPeriodo(aniosConPartidos: string[], hoy: string): { valor: Periodo; etiqueta: string }[] {
  const anioActual = hoy.slice(0, 4)
  return [
    { valor: '12m', etiqueta: 'Últimos 12 meses' },
    { valor: 'actual', etiqueta: `Este año (${anioActual})` },
    ...aniosConPartidos
      .filter((a) => a < anioActual)
      .sort()
      .reverse()
      .map((a) => ({ valor: a, etiqueta: a })),
    { valor: 'todo', etiqueta: 'Todo' },
  ]
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * '2026-10' → 'oct'. Sin año para que entren las 12 etiquetas en el ancho de
 * un iPhone; el tooltip y la tabla muestran el mes con año.
 */
export function etiquetaMesCorta(anioMes: string): string {
  return MESES_CORTOS[Number(anioMes.slice(5, 7)) - 1]
}
