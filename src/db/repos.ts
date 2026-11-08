import type { Backup, DatosBackup } from '../lib/backup'
import { limpiarNombre, normalizar } from '../lib/texto'
import { AJUSTES_POR_DEFECTO, db, type Ajustes, type Club, type ID, type Partido, type Rival, type Torneo } from './schema'

/** Errores con un mensaje pensado para mostrarle al usuario tal cual. */
export class ErrorDeUsuario extends Error {
  constructor(mensaje: string) {
    super(mensaje)
    this.name = new.target.name
  }
}

/** Se lanza al intentar borrar algo que todavía está referenciado. */
export class ErrorEnUso extends ErrorDeUsuario {}

/** Se lanza al crear o renombrar con un nombre que ya existe (ignorando mayúsculas y tildes). */
export class ErrorDuplicado extends ErrorDeUsuario {}

export class ErrorValidacion extends ErrorDeUsuario {}

const ahora = () => new Date().toISOString()

/**
 * UUID v4. crypto.randomUUID solo existe en contextos seguros (https o
 * localhost); al probar en el iPhone contra el dev server por IP no está.
 */
export function nuevoId(): ID {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Mensaje para mostrar en la UI: el propio si es un ErrorDeUsuario, si no uno genérico. */
export function mensajeDeError(e: unknown, porDefecto = 'Algo salió mal. Probá de nuevo.'): string {
  if (e instanceof ErrorDeUsuario) return e.message
  console.error(e)
  return porDefecto
}

const collator = new Intl.Collator('es', { sensitivity: 'base' })
const porNombre = (a: { nombre: string }, b: { nombre: string }) => collator.compare(a.nombre, b.nombre)

/** Devuelve el nombre limpio o lanza si está vacío o repetido. */
async function validarNombre(
  tabla: { toArray(): Promise<{ id: ID; nombre: string }[]> },
  nombre: string,
  unoLlamado: string,
  excluirId?: ID,
): Promise<string> {
  const limpio = limpiarNombre(nombre)
  if (!limpio) throw new ErrorValidacion('El nombre no puede estar vacío.')
  const clave = normalizar(limpio)
  const existente = (await tabla.toArray()).find(
    (x) => x.id !== excluirId && normalizar(x.nombre) === clave,
  )
  if (existente) throw new ErrorDuplicado(`Ya existe ${unoLlamado} «${existente.nombre}».`)
  return limpio
}

const plural = (n: number, singular: string, pluralForma: string) =>
  `${n} ${n === 1 ? singular : pluralForma}`

export const rivales = {
  listar: async () => (await db.rivales.toArray()).sort(porNombre),
  obtener: (id: ID) => db.rivales.get(id),

  crear: (datos: Omit<Rival, 'id' | 'creadoEn'>) =>
    db.transaction('rw', db.rivales, async () => {
      const nombre = await validarNombre(db.rivales, datos.nombre, 'un rival llamado')
      const rival: Rival = { ...datos, nombre, id: nuevoId(), creadoEn: ahora() }
      await db.rivales.add(rival)
      return rival
    }),

  actualizar: (id: ID, cambios: Partial<Omit<Rival, 'id' | 'creadoEn'>>) =>
    db.transaction('rw', db.rivales, async () => {
      if (cambios.nombre !== undefined) {
        cambios = { ...cambios, nombre: await validarNombre(db.rivales, cambios.nombre, 'un rival llamado', id) }
      }
      await db.rivales.update(id, cambios)
    }),

  borrar: (id: ID) =>
    db.transaction('rw', db.rivales, db.partidos, async () => {
      const rival = await db.rivales.get(id)
      if (!rival) return
      const n = await db.partidos.where('rivalId').equals(id).count()
      if (n > 0) {
        throw new ErrorEnUso(
          `No se puede borrar a ${rival.nombre} porque tiene ${plural(n, 'partido asociado', 'partidos asociados')}.`,
        )
      }
      await db.rivales.delete(id)
    }),
}

export const clubes = {
  listar: async () => (await db.clubes.toArray()).sort(porNombre),
  obtener: (id: ID) => db.clubes.get(id),

  crear: (datos: Omit<Club, 'id'>) =>
    db.transaction('rw', db.clubes, async () => {
      const nombre = await validarNombre(db.clubes, datos.nombre, 'un club llamado')
      const club: Club = { ...datos, nombre, id: nuevoId() }
      await db.clubes.add(club)
      return club
    }),

  actualizar: (id: ID, cambios: Partial<Omit<Club, 'id'>>) =>
    db.transaction('rw', db.clubes, async () => {
      if (cambios.nombre !== undefined) {
        cambios = { ...cambios, nombre: await validarNombre(db.clubes, cambios.nombre, 'un club llamado', id) }
      }
      await db.clubes.update(id, cambios)
    }),

  // Los torneos también referencian al club, así que cuentan igual que los partidos.
  borrar: (id: ID) =>
    db.transaction('rw', db.clubes, db.partidos, db.torneos, async () => {
      const club = await db.clubes.get(id)
      if (!club) return
      const nPartidos = await db.partidos.where('clubId').equals(id).count()
      const nTorneos = await db.torneos.where('clubId').equals(id).count()
      if (nPartidos > 0 || nTorneos > 0) {
        const usos = [
          nPartidos > 0 && plural(nPartidos, 'partido', 'partidos'),
          nTorneos > 0 && plural(nTorneos, 'torneo', 'torneos'),
        ].filter(Boolean)
        throw new ErrorEnUso(
          `No se puede borrar el club ${club.nombre} porque tiene ${usos.join(' y ')} asociados.`,
        )
      }
      await db.clubes.delete(id)
    }),
}

async function verificarClub(clubId: ID) {
  if (!(await db.clubes.get(clubId))) throw new ErrorValidacion('El club elegido ya no existe.')
}

export const torneos = {
  // Más recientes primero
  listar: () => db.torneos.orderBy('fecha').reverse().toArray(),
  obtener: (id: ID) => db.torneos.get(id),

  crear: (datos: Omit<Torneo, 'id'>) =>
    db.transaction('rw', db.torneos, db.clubes, async () => {
      await verificarClub(datos.clubId)
      const torneo: Torneo = { ...datos, id: nuevoId() }
      await db.torneos.add(torneo)
      return torneo
    }),

  actualizar: (id: ID, cambios: Partial<Omit<Torneo, 'id'>>) => db.torneos.update(id, cambios),

  /** Reemplaza el torneo entero: los campos opcionales que no vengan se borran. */
  reemplazar: (id: ID, datos: Omit<Torneo, 'id'>) =>
    db.transaction('rw', db.torneos, db.clubes, async () => {
      if (!(await db.torneos.get(id))) throw new ErrorValidacion('El torneo ya no existe.')
      await verificarClub(datos.clubId)
      await db.torneos.put({ ...datos, id })
    }),

  borrar: (id: ID) =>
    db.transaction('rw', db.torneos, db.partidos, async () => {
      const torneo = await db.torneos.get(id)
      if (!torneo) return
      const n = await db.partidos.where('torneoId').equals(id).count()
      if (n > 0) {
        throw new ErrorEnUso(
          `No se puede borrar el torneo ${torneo.nombre} porque tiene ${plural(n, 'partido asociado', 'partidos asociados')}.`,
        )
      }
      await db.torneos.delete(id)
    }),
}

async function verificarReferenciasPartido(datos: Omit<Partido, 'id' | 'creadoEn'>) {
  if (!(await db.rivales.get(datos.rivalId))) throw new ErrorValidacion('El rival elegido ya no existe.')
  await verificarClub(datos.clubId)
  if (datos.tipo === 'torneo' && !(datos.torneoId && (await db.torneos.get(datos.torneoId)))) {
    throw new ErrorValidacion('El torneo elegido ya no existe.')
  }
}

export const partidos = {
  /** Orden cronológico: fecha y luego creadoEn. */
  listar: () => db.partidos.orderBy('[fecha+creadoEn]').toArray(),
  obtener: (id: ID) => db.partidos.get(id),
  porRival: (rivalId: ID) => db.partidos.where('rivalId').equals(rivalId).sortBy('fecha'),
  porTorneo: (torneoId: ID) => db.partidos.where('torneoId').equals(torneoId).sortBy('fecha'),

  crear: (datos: Omit<Partido, 'id' | 'creadoEn'>) =>
    db.transaction('rw', [db.partidos, db.rivales, db.clubes, db.torneos], async () => {
      await verificarReferenciasPartido(datos)
      const partido: Partido = { ...datos, id: nuevoId(), creadoEn: ahora() }
      await db.partidos.add(partido)
      return partido
    }),

  actualizar: (id: ID, cambios: Partial<Omit<Partido, 'id' | 'creadoEn'>>) =>
    db.partidos.update(id, cambios),

  /** Reemplaza el partido entero (conserva creadoEn): los campos opcionales que no vengan se borran. */
  reemplazar: (id: ID, datos: Omit<Partido, 'id' | 'creadoEn'>) =>
    db.transaction('rw', [db.partidos, db.rivales, db.clubes, db.torneos], async () => {
      const existente = await db.partidos.get(id)
      if (!existente) throw new ErrorValidacion('El partido ya no existe.')
      await verificarReferenciasPartido(datos)
      await db.partidos.put({ ...datos, id, creadoEn: existente.creadoEn })
    }),

  /** Club del último partido cargado (por creadoEn), para usarlo por defecto. */
  async ultimoClubUsado(): Promise<ID | undefined> {
    let ultimo: Partido | undefined
    await db.partidos.each((p) => {
      if (!ultimo || p.creadoEn > ultimo.creadoEn) ultimo = p
    })
    return ultimo?.clubId
  },

  borrar: (id: ID) => db.partidos.delete(id),
}

export const ajustes = {
  /** Todos los ajustes, con los valores por defecto para los que no se guardaron. */
  async obtener(): Promise<Ajustes> {
    const filas = await db.ajustes.toArray()
    return { ...AJUSTES_POR_DEFECTO, ...Object.fromEntries(filas.map((f) => [f.clave, f.valor])) }
  },

  guardar: <K extends keyof Ajustes>(clave: K, valor: Ajustes[K]) => db.ajustes.put({ clave, valor }),
}

export const datosCompletos = {
  exportar: (): Promise<DatosBackup> =>
    db.transaction('r', [db.rivales, db.clubes, db.torneos, db.partidos], async () => ({
      rivales: await db.rivales.toArray(),
      clubes: await db.clubes.toArray(),
      torneos: await db.torneos.toArray(),
      partidos: await db.partidos.toArray(),
    })),

  /**
   * Reemplaza todos los datos por los del backup, en una sola transacción: si
   * algo falla no queda nada a medias. Conserva la fecha del último backup local.
   */
  reemplazarTodo: (b: Backup) =>
    db.transaction('rw', [db.rivales, db.clubes, db.torneos, db.partidos, db.ajustes], async () => {
      await Promise.all([db.rivales.clear(), db.clubes.clear(), db.torneos.clear(), db.partidos.clear()])
      await db.rivales.bulkAdd(b.datos.rivales)
      await db.clubes.bulkAdd(b.datos.clubes)
      await db.torneos.bulkAdd(b.datos.torneos)
      await db.partidos.bulkAdd(b.datos.partidos)
      await db.ajustes.put({ clave: 'incluirWO', valor: b.ajustes.incluirWO })
    }),
}
