import { z } from 'zod'
import type { RondaAlcanzada, Torneo } from '../db/schema'

export const RONDAS: { valor: RondaAlcanzada; etiqueta: string }[] = [
  { valor: 'campeon', etiqueta: 'Campeón' },
  { valor: 'final', etiqueta: 'Final' },
  { valor: 'semifinal', etiqueta: 'Semifinal' },
  { valor: 'cuartos', etiqueta: 'Cuartos' },
  { valor: 'octavos', etiqueta: 'Octavos' },
  { valor: '16avos', etiqueta: '16avos' },
  { valor: 'primera_ronda', etiqueta: 'Primera ronda' },
]

export const FORMATOS: { valor: Torneo['formato']; etiqueta: string }[] = [
  { valor: 'eliminacion', etiqueta: 'Eliminación' },
  { valor: 'liga', etiqueta: 'Liga' },
]

/** "Campeón", "Semifinal", "3° en liga" o null si no se cargó el resultado. */
export function etiquetaResultado(t: Pick<Torneo, 'formato' | 'rondaAlcanzada' | 'posicionLiga'>): string | null {
  if (t.formato === 'liga') return t.posicionLiga ? `${t.posicionLiga}° en liga` : null
  return RONDAS.find((r) => r.valor === t.rondaAlcanzada)?.etiqueta ?? null
}

/** Nombre + año, para distinguir ediciones del mismo torneo: "Abierto de Otoño · 2026". */
export function etiquetaTorneo(t: Pick<Torneo, 'nombre' | 'fecha'>): string {
  return `${t.nombre} · ${t.fecha.slice(0, 4)}`
}

/** Valores tal como los maneja el formulario (todo texto). */
export interface ValoresFormTorneo {
  nombre: string
  fecha: string
  categoria: string
  clubId: string
  formato: Torneo['formato']
  rondaAlcanzada: string // '' = sin resultado
  posicionLiga: string // '' = sin resultado
}

export function valoresDesdeTorneo(t: Torneo): ValoresFormTorneo {
  return {
    nombre: t.nombre,
    fecha: t.fecha,
    categoria: t.categoria ?? '',
    clubId: t.clubId,
    formato: t.formato,
    rondaAlcanzada: t.rondaAlcanzada ?? '',
    posicionLiga: t.posicionLiga?.toString() ?? '',
  }
}

const vacioAUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

/**
 * Valida los valores del formulario y los convierte a un Torneo sin id.
 * Solo conserva el resultado que corresponde al formato (ronda o posición).
 */
export const esquemaTorneo = z
  .object({
    nombre: z.string().trim().min(1, 'Poné un nombre.').max(100, 'El nombre es demasiado largo.'),
    fecha: z.iso.date('Elegí una fecha válida.'),
    categoria: z.preprocess(vacioAUndefined, z.string().trim().max(50, 'La categoría es demasiado larga.').optional()),
    clubId: z.string().min(1, 'Elegí un club.'),
    formato: z.enum(['eliminacion', 'liga'], 'Elegí un formato.'),
    rondaAlcanzada: z.preprocess(
      vacioAUndefined,
      z.enum(RONDAS.map((r) => r.valor) as [RondaAlcanzada, ...RondaAlcanzada[]], 'Elegí una ronda válida.').optional(),
    ),
    posicionLiga: z.preprocess(
      (v) => (vacioAUndefined(v) === undefined ? undefined : Number(v)),
      z
        .number('La posición tiene que ser un número.')
        .int('La posición tiene que ser un número entero.')
        .min(1, 'La posición tiene que ser 1 o más.')
        .max(999, 'La posición es demasiado alta.')
        .optional(),
    ),
  })
  .transform(({ rondaAlcanzada, posicionLiga, categoria, ...resto }): Omit<Torneo, 'id'> => ({
    ...resto,
    ...(categoria !== undefined ? { categoria } : {}),
    ...(resto.formato === 'eliminacion' && rondaAlcanzada !== undefined ? { rondaAlcanzada } : {}),
    ...(resto.formato === 'liga' && posicionLiga !== undefined ? { posicionLiga } : {}),
  }))

export type ErroresForm<T> = Partial<Record<keyof T, string>>

/** Valida y devuelve el torneo o el primer error de cada campo. */
export function validarTorneo(
  valores: ValoresFormTorneo,
): { ok: true; datos: Omit<Torneo, 'id'> } | { ok: false; errores: ErroresForm<ValoresFormTorneo> } {
  const r = esquemaTorneo.safeParse(valores)
  if (r.success) return { ok: true, datos: r.data }
  const errores: ErroresForm<ValoresFormTorneo> = {}
  for (const issue of r.error.issues) {
    const campo = issue.path[0] as keyof ValoresFormTorneo
    errores[campo] ??= issue.message
  }
  return { ok: false, errores }
}
