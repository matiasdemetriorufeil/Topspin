import { z } from 'zod'
import type { Club, Partido, Rival, Torneo } from '../db/schema'

/** Subir cuando cambie la forma del backup (y saber migrar las versiones anteriores). */
export const VERSION_BACKUP = 1

export interface DatosBackup {
  rivales: Rival[]
  clubes: Club[]
  torneos: Torneo[]
  partidos: Partido[]
}

export interface Backup {
  app: 'mi-tenis'
  version: number
  /** ISO timestamp */
  exportadoEn: string
  /** Solo las preferencias que tiene sentido restaurar (no la fecha del último backup) */
  ajustes: { incluirWO: boolean }
  datos: DatosBackup
}

export function crearBackup(datos: DatosBackup, ajustes: { incluirWO: boolean }, ahora: Date): Backup {
  return { app: 'mi-tenis', version: VERSION_BACKUP, exportadoEn: ahora.toISOString(), ajustes, datos }
}

/** mi-tenis-backup-2026-11-01.json (fecha local) */
export function nombreArchivo(tipo: 'backup' | 'partidos', ahora: Date, extension: 'json' | 'csv'): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`
  return `mi-tenis-${tipo}-${fecha}.${extension}`
}

// ---------- Validación ----------

const id = z.string().min(1)
const fechaISO = z.iso.date()
const entero = (min: number, max: number) => z.number().int().min(min).max(max)

const esquemaRival = z.object({ id, nombre: z.string().min(1), creadoEn: z.string().min(1) })
const esquemaClub = z.object({ id, nombre: z.string().min(1) })
const esquemaTorneo = z.object({
  id,
  nombre: z.string().min(1),
  fecha: fechaISO,
  categoria: z.string().optional(),
  clubId: id,
  formato: z.enum(['eliminacion', 'liga']),
  rondaAlcanzada: z.enum(['campeon', 'final', 'semifinal', 'cuartos', 'octavos', '16avos', 'primera_ronda']).optional(),
  posicionLiga: entero(1, 999).optional(),
})
const esquemaSet = z.object({
  gane: z.boolean(),
  misGames: entero(0, 99).optional(),
  susGames: entero(0, 99).optional(),
  tiebreak: z.object({ mios: entero(0, 99), suyos: entero(0, 99) }).optional(),
})
const esquemaPartido = z.object({
  id,
  fecha: fechaISO,
  rivalId: id,
  clubId: id,
  tipo: z.enum(['amistoso', 'torneo']),
  torneoId: id.optional(),
  ronda: z.string().optional(),
  estado: z.enum(['completado', 'wo_ganado', 'wo_perdido', 'suspendido', 'retiro']),
  retiroDe: z.enum(['yo', 'rival']).optional(),
  sets: z.array(esquemaSet).max(5),
  notas: z.string().optional(),
  creadoEn: z.string().min(1),
})

/** Ids repetidos dentro de una tabla */
function repetidos(filas: { id: string }[]): string[] {
  const vistos = new Set<string>()
  const rep = new Set<string>()
  for (const f of filas) (vistos.has(f.id) ? rep : vistos).add(f.id)
  return [...rep]
}

export const esquemaBackup = z
  .object({
    app: z.literal('mi-tenis', 'No es un backup de Mi Tenis.'),
    version: z.number().int().min(1),
    exportadoEn: z.iso.datetime(),
    ajustes: z.object({ incluirWO: z.boolean() }).default({ incluirWO: false }),
    datos: z.object({
      rivales: z.array(esquemaRival),
      clubes: z.array(esquemaClub),
      torneos: z.array(esquemaTorneo),
      partidos: z.array(esquemaPartido),
    }),
  })
  .superRefine(({ version, datos }, ctx) => {
    const problema = (message: string) => ctx.addIssue({ code: 'custom', message, path: ['datos'] })
    if (version > VERSION_BACKUP) {
      problema('El backup es de una versión más nueva de la app. Actualizala y volvé a intentar.')
      return
    }
    for (const [tabla, filas] of Object.entries(datos)) {
      const rep = repetidos(filas)
      if (rep.length) problema(`Hay ${tabla} con el mismo id (${rep[0]}).`)
    }
    const rivales = new Set(datos.rivales.map((r) => r.id))
    const clubes = new Set(datos.clubes.map((c) => c.id))
    const torneos = new Set(datos.torneos.map((t) => t.id))
    for (const t of datos.torneos) {
      if (!clubes.has(t.clubId)) problema(`El torneo «${t.nombre}» apunta a un club que no está en el backup.`)
    }
    for (const p of datos.partidos) {
      if (!rivales.has(p.rivalId)) problema(`El partido del ${p.fecha} apunta a un rival que no está en el backup.`)
      if (!clubes.has(p.clubId)) problema(`El partido del ${p.fecha} apunta a un club que no está en el backup.`)
      if (p.torneoId && !torneos.has(p.torneoId)) problema(`El partido del ${p.fecha} apunta a un torneo que no está en el backup.`)
      if (p.tipo === 'torneo' && !p.torneoId) problema(`El partido del ${p.fecha} es de torneo pero no tiene torneo.`)
    }
  })

/** "partidos.3.fecha" para ubicar el error dentro del archivo */
function ubicacion(path: PropertyKey[]): string {
  return path.filter((p) => p !== 'datos').map(String).join('.')
}

/** Lee y valida el contenido de un archivo de backup. */
export function leerBackup(texto: string): { ok: true; backup: Backup } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(texto)
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' }
  }
  const r = esquemaBackup.safeParse(json)
  if (r.success) return { ok: true, backup: r.data as Backup }

  const issue = r.error.issues[0]
  if (issue.code === 'custom' || issue.path[0] === 'app') return { ok: false, error: issue.message }
  const donde = ubicacion(issue.path)
  return { ok: false, error: `El archivo no es un backup válido${donde ? ` (en ${donde})` : ''}.` }
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

/** "120 partidos, 15 rivales, 2 clubes y 4 torneos" */
export function resumenDatos(d: { [K in keyof DatosBackup]: { length: number } }): string {
  const partes = [
    plural(d.partidos.length, 'partido', 'partidos'),
    plural(d.rivales.length, 'rival', 'rivales'),
    plural(d.clubes.length, 'club', 'clubes'),
    plural(d.torneos.length, 'torneo', 'torneos'),
  ]
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
}

// ---------- Recordatorio ----------

export const DIAS_AVISO_BACKUP = 30

/** Días completos entre dos instantes. */
export function diasEntre(desde: Date, hasta: Date): number {
  return Math.floor((hasta.getTime() - desde.getTime()) / 86_400_000)
}

/**
 * ¿Mostrar el aviso de backup? Solo si hay partidos para perder y nunca se
 * hizo un backup o pasaron más de 30 días.
 */
export function avisoBackup(
  ultimoBackup: string | undefined,
  hayPartidos: boolean,
  ahora: Date,
): { tipo: 'nunca' } | { tipo: 'viejo'; dias: number } | null {
  if (!hayPartidos) return null
  if (!ultimoBackup) return { tipo: 'nunca' }
  const dias = diasEntre(new Date(ultimoBackup), ahora)
  return dias > DIAS_AVISO_BACKUP ? { tipo: 'viejo', dias } : null
}
