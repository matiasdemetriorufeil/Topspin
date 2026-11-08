import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { validarPartido, valoresDesdePartido } from '../lib/partido'
import { resultadoPartido } from '../lib/resultado'
import { cargarDatosPrueba } from './datosPrueba'
import { crearBackup } from '../lib/backup'
import { ajustes, clubes, datosCompletos, ErrorDuplicado, ErrorEnUso, ErrorValidacion, nuevoId, partidos, rivales, torneos } from './repos'
import { db } from './schema'

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
})

async function crearBase() {
  const club = await clubes.crear({ nombre: 'Club Test' })
  const rival = await rivales.crear({ nombre: 'Rival Test' })
  const torneo = await torneos.crear({ nombre: 'Torneo Test', fecha: '2026-05-01', clubId: club.id, formato: 'eliminacion' })
  return { club, rival, torneo }
}

describe('borrado con referencias', () => {
  it('borra entidades sin partidos', async () => {
    const { club, rival, torneo } = await crearBase()
    await rivales.borrar(rival.id)
    await torneos.borrar(torneo.id)
    await clubes.borrar(club.id)
    expect(await db.rivales.count()).toBe(0)
    expect(await db.torneos.count()).toBe(0)
    expect(await db.clubes.count()).toBe(0)
  })

  it('no borra rival, club ni torneo con partidos asociados', async () => {
    const { club, rival, torneo } = await crearBase()
    await partidos.crear({
      fecha: '2026-05-02', rivalId: rival.id, clubId: club.id, tipo: 'torneo', torneoId: torneo.id,
      ronda: 'Final', estado: 'completado', sets: [{ gane: true }, { gane: true }],
    })

    await expect(rivales.borrar(rival.id)).rejects.toThrow(
      new ErrorEnUso('No se puede borrar a Rival Test porque tiene 1 partido asociado.'),
    )
    await expect(torneos.borrar(torneo.id)).rejects.toBeInstanceOf(ErrorEnUso)
    await expect(clubes.borrar(club.id)).rejects.toThrow(
      'No se puede borrar el club Club Test porque tiene 1 partido y 1 torneo asociados.',
    )
    expect(await db.rivales.count()).toBe(1)
  })

  it('no borra un club que solo tiene torneos', async () => {
    const { club } = await crearBase()
    await expect(clubes.borrar(club.id)).rejects.toBeInstanceOf(ErrorEnUso)
  })
})

describe('nombres de rivales y clubes', () => {
  it('guarda el nombre limpio', async () => {
    const rival = await rivales.crear({ nombre: '  Juan   Pérez ' })
    expect(rival.nombre).toBe('Juan Pérez')
  })

  it('no permite crear duplicados ignorando mayúsculas y tildes', async () => {
    await rivales.crear({ nombre: 'Juan Pérez' })
    await expect(rivales.crear({ nombre: 'JUAN perez' })).rejects.toThrow(
      new ErrorDuplicado('Ya existe un rival llamado «Juan Pérez».'),
    )
    await clubes.crear({ nombre: 'Club Ñandú' })
    await expect(clubes.crear({ nombre: 'club ñandu' })).rejects.toBeInstanceOf(ErrorDuplicado)
    expect(await db.rivales.count()).toBe(1)
  })

  it('no permite renombrar a un nombre que ya existe', async () => {
    await rivales.crear({ nombre: 'Juan Pérez' })
    const otro = await rivales.crear({ nombre: 'Pedro' })
    await expect(rivales.actualizar(otro.id, { nombre: 'juan pérez' })).rejects.toBeInstanceOf(ErrorDuplicado)
    expect((await rivales.obtener(otro.id))?.nombre).toBe('Pedro')
  })

  it('permite renombrar cambiando solo mayúsculas o tildes del propio nombre', async () => {
    const rival = await rivales.crear({ nombre: 'juan perez' })
    await rivales.actualizar(rival.id, { nombre: 'Juan Pérez' })
    expect((await rivales.obtener(rival.id))?.nombre).toBe('Juan Pérez')
  })

  it('rechaza nombres vacíos', async () => {
    await expect(clubes.crear({ nombre: '   ' })).rejects.toBeInstanceOf(ErrorValidacion)
  })

  it('lista ordenado alfabéticamente en español', async () => {
    for (const nombre of ['Zoe', 'álvaro', 'Bruno']) await rivales.crear({ nombre })
    expect((await rivales.listar()).map((r) => r.nombre)).toEqual(['álvaro', 'Bruno', 'Zoe'])
  })
})

describe('torneos', () => {
  it('no crea un torneo con un club inexistente', async () => {
    await expect(
      torneos.crear({ nombre: 'X', fecha: '2026-01-01', clubId: 'no-existe', formato: 'liga' }),
    ).rejects.toBeInstanceOf(ErrorValidacion)
  })

  it('reemplazar borra los campos opcionales que ya no vienen', async () => {
    const { club, torneo } = await crearBase()
    await torneos.reemplazar(torneo.id, { ...torneo, categoria: 'Primera', rondaAlcanzada: 'final' })
    await torneos.reemplazar(torneo.id, { nombre: 'Liga', fecha: '2026-05-01', clubId: club.id, formato: 'liga', posicionLiga: 3 })
    expect(await torneos.obtener(torneo.id)).toEqual({
      id: torneo.id, nombre: 'Liga', fecha: '2026-05-01', clubId: club.id, formato: 'liga', posicionLiga: 3,
    })
  })
})

describe('datos de prueba', () => {
  it('carga las cantidades esperadas con referencias válidas', async () => {
    await cargarDatosPrueba()
    expect(await db.rivales.count()).toBe(6)
    expect(await db.clubes.count()).toBe(2)
    expect(await db.torneos.count()).toBe(4)

    const todos = await partidos.listar()
    expect(todos).toHaveLength(40)

    const ids = {
      rivales: new Set((await rivales.listar()).map((r) => r.id)),
      clubes: new Set((await clubes.listar()).map((c) => c.id)),
      torneos: new Set((await torneos.listar()).map((t) => t.id)),
    }
    for (const p of todos) {
      expect(ids.rivales.has(p.rivalId)).toBe(true)
      expect(ids.clubes.has(p.clubId)).toBe(true)
      if (p.tipo === 'torneo') expect(ids.torneos.has(p.torneoId!)).toBe(true)
      if (p.estado === 'completado') expect(resultadoPartido(p)).not.toBeNull()
      // todo partido de prueba tiene que poder abrirse y guardarse en el formulario
      expect(validarPartido(valoresDesdePartido(p))).toMatchObject({ ok: true })
    }

    const meses = new Set(todos.map((p) => p.fecha.slice(0, 7)))
    expect(meses.size).toBeGreaterThanOrEqual(10)
  })
})

describe('partidos', () => {
  it('no guarda un partido con referencias inexistentes', async () => {
    const { club, rival } = await crearBase()
    const datos = { fecha: '2026-05-02', rivalId: rival.id, clubId: club.id, tipo: 'amistoso' as const, estado: 'completado' as const, sets: [{ gane: true }] }
    await expect(partidos.crear({ ...datos, rivalId: 'x' })).rejects.toThrow('El rival elegido ya no existe.')
    await expect(partidos.crear({ ...datos, clubId: 'x' })).rejects.toThrow('El club elegido ya no existe.')
    await expect(partidos.crear({ ...datos, tipo: 'torneo', torneoId: 'x' })).rejects.toThrow('El torneo elegido ya no existe.')
    expect(await db.partidos.count()).toBe(0)
  })

  it('reemplazar conserva creadoEn y borra opcionales que ya no vienen', async () => {
    const { club, rival, torneo } = await crearBase()
    const p = await partidos.crear({
      fecha: '2026-05-02', rivalId: rival.id, clubId: club.id, tipo: 'torneo', torneoId: torneo.id, ronda: 'Final',
      estado: 'completado', sets: [{ gane: true }], notas: 'x',
    })
    await partidos.reemplazar(p.id, { fecha: '2026-05-03', rivalId: rival.id, clubId: club.id, tipo: 'amistoso', estado: 'wo_ganado', sets: [] })
    expect(await partidos.obtener(p.id)).toEqual({
      id: p.id, creadoEn: p.creadoEn, fecha: '2026-05-03', rivalId: rival.id, clubId: club.id, tipo: 'amistoso', estado: 'wo_ganado', sets: [],
    })
  })

  it('ultimoClubUsado devuelve el club del último partido cargado, no del más reciente por fecha', async () => {
    const { club, rival } = await crearBase()
    const otro = await clubes.crear({ nombre: 'Otro' })
    expect(await partidos.ultimoClubUsado()).toBeUndefined()
    const datos = { rivalId: rival.id, tipo: 'amistoso' as const, estado: 'completado' as const, sets: [{ gane: true }] }
    await partidos.crear({ ...datos, fecha: '2026-06-01', clubId: club.id })
    await new Promise((r) => setTimeout(r, 2))
    await partidos.crear({ ...datos, fecha: '2026-01-01', clubId: otro.id })
    expect(await partidos.ultimoClubUsado()).toBe(otro.id)
  })
})

describe('nuevoId', () => {
  it('genera UUID v4 aunque no exista crypto.randomUUID', () => {
    const original = crypto.randomUUID
    try {
      Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
      const id = nuevoId()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(nuevoId()).not.toBe(id)
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true })
    }
  })
})

describe('ajustes', () => {
  it('sin nada guardado devuelve los valores por defecto', async () => {
    expect(await ajustes.obtener()).toEqual({ incluirWO: false })
  })

  it('guarda y lee', async () => {
    await ajustes.guardar('incluirWO', true)
    await ajustes.guardar('ultimoBackup', '2026-11-01T10:00:00.000Z')
    expect(await ajustes.obtener()).toEqual({ incluirWO: true, ultimoBackup: '2026-11-01T10:00:00.000Z' })
  })
})

describe('backup completo', () => {
  it('exportar → reemplazarTodo deja los mismos datos y conserva el último backup local', async () => {
    await cargarDatosPrueba()
    await ajustes.guardar('ultimoBackup', '2026-11-01T10:00:00.000Z')
    const exportado = await datosCompletos.exportar()
    const b = crearBackup(exportado, { incluirWO: true }, new Date('2026-11-01T10:00:00.000Z'))

    // cambio todo antes de importar
    await cargarDatosPrueba()
    await rivales.crear({ nombre: 'Rival que no estaba' })

    await datosCompletos.reemplazarTodo(b)
    const despues = await datosCompletos.exportar()
    const porId = <T extends { id: string }>(xs: T[]) => [...xs].sort((a, b) => a.id.localeCompare(b.id))
    expect(porId(despues.partidos)).toEqual(porId(exportado.partidos))
    expect(porId(despues.rivales)).toEqual(porId(exportado.rivales))
    expect(await ajustes.obtener()).toEqual({ incluirWO: true, ultimoBackup: '2026-11-01T10:00:00.000Z' })
  })

  it('si el backup falla al escribir, no se pierde nada', async () => {
    await cargarDatosPrueba()
    const antes = await db.partidos.count()
    const roto = crearBackup(
      { rivales: [{ id: 'x', nombre: 'A', creadoEn: 'x' }, { id: 'x', nombre: 'B', creadoEn: 'x' }], clubes: [], torneos: [], partidos: [] },
      { incluirWO: false },
      new Date(),
    )
    await expect(datosCompletos.reemplazarTodo(roto)).rejects.toThrow()
    expect(await db.partidos.count()).toBe(antes)
  })
})
