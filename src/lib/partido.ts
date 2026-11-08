import { z } from 'zod'
import type { EstadoPartido, Partido, SetJugado } from '../db/schema'
import { resultadoPartido, textoResultado, type Resultado } from './resultado'
import { esMarcadorTerminado } from './sets'

export const ESTADOS: { valor: EstadoPartido; etiqueta: string }[] = [
  { valor: 'completado', etiqueta: 'Completado' },
  { valor: 'wo_ganado', etiqueta: 'WO ganado' },
  { valor: 'wo_perdido', etiqueta: 'WO perdido' },
  { valor: 'suspendido', etiqueta: 'Suspendido' },
  { valor: 'retiro', etiqueta: 'Retiro' },
]

export const RONDAS_PARTIDO = ['Primera ronda', 'Octavos', 'Cuartos', 'Semifinal', 'Final']

export const MAX_SETS = 5

export const esWO = (estado: EstadoPartido) => estado === 'wo_ganado' || estado === 'wo_perdido'

/** Un set tal como lo maneja el formulario (games como texto). */
export interface ValoresSet {
  /** Clave estable para React al agregar/quitar sets */
  clave: string
  /** Elegido con el toggle; si hay games distintos, manda lo que dicen los games */
  gane: boolean | null
  misGames: string
  susGames: string
  tbMios: string
  tbSuyos: string
}

export interface ValoresFormPartido {
  fecha: string
  rivalId: string
  clubId: string
  tipo: Partido['tipo']
  torneoId: string
  ronda: string
  estado: EstadoPartido
  retiroDe: '' | 'yo' | 'rival'
  sets: ValoresSet[]
  notas: string
}

let ultimaClave = 0

export function setVacio(): ValoresSet {
  return { clave: `set-${++ultimaClave}`, gane: null, misGames: '', susGames: '', tbMios: '', tbSuyos: '' }
}

/** 0 a 99; undefined si está vacío o no es un número. */
function entero(texto: string): number | undefined {
  const t = texto.trim()
  return /^\d{1,2}$/.test(t) ? Number(t) : undefined
}

const es76 = (a: number, b: number) => Math.max(a, b) === 7 && Math.min(a, b) === 6

/** Quién ganó el set según los games, o null si no se puede saber (vacíos o iguales). */
export function ganeInferido(s: Pick<ValoresSet, 'misGames' | 'susGames'>): boolean | null {
  const mis = entero(s.misGames)
  const sus = entero(s.susGames)
  if (mis === undefined || sus === undefined || mis === sus) return null
  return mis > sus
}

export function ganeDelSet(s: ValoresSet): boolean | null {
  return ganeInferido(s) ?? s.gane
}

/** El tie-break solo aplica a sets 7-6 o 6-7. */
export function llevaTiebreak(s: Pick<ValoresSet, 'misGames' | 'susGames'>): boolean {
  const mis = entero(s.misGames)
  const sus = entero(s.susGames)
  return mis !== undefined && sus !== undefined && es76(mis, sus)
}

/**
 * Revisa un set y devuelve el problema o null si está bien.
 * - terminado: el set tiene que tener un resultado final (6-x, 7-5, 7-6).
 *   Solo el último set de un retiro o suspendido puede quedar a medias.
 * - ultimo: en el último set se acepta un super tie-break (10-8, 11-9…).
 */
export function problemaSet(s: ValoresSet, { terminado, ultimo }: { terminado: boolean; ultimo: boolean }): string | null {
  const mis = entero(s.misGames)
  const sus = entero(s.susGames)
  const hayMis = s.misGames.trim() !== ''
  const haySus = s.susGames.trim() !== ''
  if ((hayMis && mis === undefined) || (haySus && sus === undefined)) return 'Los games tienen que ser números.'
  if (hayMis !== haySus) return 'Completá los games de los dos.'
  if (ganeDelSet(s) === null) return 'Marcá si ganaste o perdiste el set.'
  if (mis === undefined || sus === undefined) return null

  const marcadorFinal = esMarcadorTerminado(mis, sus, { superTiebreak: ultimo })
  if (terminado && !marcadorFinal) return `${mis}-${sus} no es el resultado de un set terminado.`
  if (!terminado && !marcadorFinal && Math.max(mis, sus) > 6) return `${mis}-${sus} no es un resultado posible.`

  if (es76(mis, sus) && (s.tbMios.trim() !== '' || s.tbSuyos.trim() !== '')) {
    const a = entero(s.tbMios)
    const b = entero(s.tbSuyos)
    if (a === undefined || b === undefined) return 'Completá el tie-break de los dos.'
    const tbMax = Math.max(a, b)
    const tbMin = Math.min(a, b)
    if (tbMax < 7 || tbMax - tbMin < 2 || (tbMax > 7 && tbMax - tbMin !== 2)) return `El tie-break ${a}-${b} no es válido.`
    if (a > b !== mis > sus) return 'El tie-break lo tiene que ganar quien ganó el set.'
  }
  return null
}

/** Convierte un set ya validado al modelo. */
export function aSetJugado(s: ValoresSet): SetJugado {
  const gane = ganeDelSet(s) ?? false
  const mis = entero(s.misGames)
  const sus = entero(s.susGames)
  if (mis === undefined || sus === undefined) return { gane }
  const set: SetJugado = { gane, misGames: mis, susGames: sus }
  const a = entero(s.tbMios)
  const b = entero(s.tbSuyos)
  if (es76(mis, sus) && a !== undefined && b !== undefined) set.tiebreak = { mios: a, suyos: b }
  return set
}

const esquemaSet = z.object({
  clave: z.string(),
  gane: z.boolean().nullable(),
  misGames: z.string(),
  susGames: z.string(),
  tbMios: z.string(),
  tbSuyos: z.string(),
})

export const esquemaPartido = z
  .object({
    fecha: z.iso.date('Elegí una fecha válida.'),
    rivalId: z.string().min(1, 'Elegí el rival.'),
    clubId: z.string().min(1, 'Elegí el club.'),
    tipo: z.enum(['amistoso', 'torneo']),
    torneoId: z.string(),
    ronda: z.string().trim().max(40, 'La ronda es demasiado larga.'),
    estado: z.enum(['completado', 'wo_ganado', 'wo_perdido', 'suspendido', 'retiro']),
    retiroDe: z.enum(['', 'yo', 'rival']),
    sets: z.array(esquemaSet).max(MAX_SETS, `Se pueden cargar hasta ${MAX_SETS} sets.`),
    notas: z.string().trim().max(1000, 'Las notas son demasiado largas.'),
  })
  .superRefine((v, ctx) => {
    const problema = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message })

    if (v.tipo === 'torneo' && !v.torneoId) problema(['torneoId'], 'Elegí el torneo.')
    if (v.estado === 'retiro' && !v.retiroDe) problema(['retiroDe'], 'Indicá quién se retiró.')
    if (esWO(v.estado)) return // en WO los sets se ignoran

    if (v.estado === 'completado' && v.sets.length === 0) {
      problema(['sets'], 'Cargá al menos un set.')
      return
    }

    let setsBien = true
    v.sets.forEach((s, i) => {
      const ultimo = i === v.sets.length - 1
      const p = problemaSet(s, { terminado: v.estado === 'completado' || !ultimo, ultimo })
      if (p) {
        setsBien = false
        problema(['sets', i], p)
      }
    })
    if (!setsBien || v.estado !== 'completado') return

    const ganes = v.sets.map((s) => ganeDelSet(s) as boolean)
    const r = resultadoPartido({ estado: 'completado', sets: ganes.map((gane) => ({ gane })) })
    if (r === null) problema(['sets'], 'Los sets quedaron empatados: falta definir un ganador.')
    else if ((r === 'ganado') !== ganes[ganes.length - 1]) {
      problema(['sets'], 'El último set lo tiene que ganar quien ganó el partido.')
    }
  })
  .transform(
    (v): Omit<Partido, 'id' | 'creadoEn'> => ({
      fecha: v.fecha,
      rivalId: v.rivalId,
      clubId: v.clubId,
      tipo: v.tipo,
      ...(v.tipo === 'torneo' ? { torneoId: v.torneoId, ...(v.ronda ? { ronda: v.ronda } : {}) } : {}),
      estado: v.estado,
      ...(v.estado === 'retiro' && v.retiroDe ? { retiroDe: v.retiroDe } : {}),
      sets: esWO(v.estado) ? [] : v.sets.map(aSetJugado),
      ...(v.notas ? { notas: v.notas } : {}),
    }),
  )

/** Errores por campo. Los de un set van en "sets.0", "sets.1"…; los de la lista entera en "sets". */
export type ErroresPartido = Record<string, string>

export function validarPartido(
  valores: ValoresFormPartido,
): { ok: true; datos: Omit<Partido, 'id' | 'creadoEn'> } | { ok: false; errores: ErroresPartido } {
  const r = esquemaPartido.safeParse(valores)
  if (r.success) return { ok: true, datos: r.data }
  const errores: ErroresPartido = {}
  for (const issue of r.error.issues) {
    const [campo, indice] = issue.path
    const clave = campo === 'sets' && typeof indice === 'number' ? `sets.${indice}` : String(campo)
    errores[clave] ??= issue.message
  }
  return { ok: false, errores }
}

export function valoresDesdePartido(p: Partido): ValoresFormPartido {
  return {
    fecha: p.fecha,
    rivalId: p.rivalId,
    clubId: p.clubId,
    tipo: p.tipo,
    torneoId: p.torneoId ?? '',
    ronda: p.ronda ?? '',
    estado: p.estado,
    retiroDe: p.retiroDe ?? '',
    sets: p.sets.map((s) => ({
      ...setVacio(),
      gane: s.gane,
      misGames: s.misGames?.toString() ?? '',
      susGames: s.susGames?.toString() ?? '',
      tbMios: s.tiebreak?.mios.toString() ?? '',
      tbSuyos: s.tiebreak?.suyos.toString() ?? '',
    })),
    notas: p.notas ?? '',
  }
}

/** Resultado en vivo mientras se completa el formulario (ignora los sets sin definir). */
export function vistaPrevia(v: ValoresFormPartido): { resultado: Resultado; texto: string } {
  const partido = {
    estado: v.estado,
    retiroDe: v.retiroDe || undefined,
    sets: esWO(v.estado)
      ? []
      : v.sets.map(ganeDelSet).filter((g): g is boolean => g !== null).map((gane) => ({ gane })),
  }
  return { resultado: resultadoPartido(partido), texto: textoResultado(partido) }
}
