import { describe, expect, it } from 'vitest'
import { filtrarPorNombre, limpiarNombre, mismoNombre, normalizar } from './texto'

describe('limpiarNombre', () => {
  it('saca espacios de los bordes y colapsa los repetidos', () => {
    expect(limpiarNombre('  Juan   Pérez ')).toBe('Juan Pérez')
  })
})

describe('normalizar / mismoNombre', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(normalizar('JOSÉ Pérez')).toBe('jose perez')
    expect(mismoNombre('Martín Gómez', 'martin gomez')).toBe(true)
  })

  it('ignora diéresis', () => {
    expect(mismoNombre('Güemes', 'guemes')).toBe(true)
  })

  it('ignora espacios de más', () => {
    expect(mismoNombre(' Juan  Pérez', 'juan perez ')).toBe(true)
  })

  it('distingue ñ de n', () => {
    expect(normalizar('MUÑOZ')).toBe('muñoz')
    expect(mismoNombre('Muñoz', 'Munoz')).toBe(false)
  })

  it('distingue nombres distintos', () => {
    expect(mismoNombre('Juan Pérez', 'Juana Pérez')).toBe(false)
  })
})

describe('filtrarPorNombre', () => {
  const items = [{ nombre: 'Martín Gómez' }, { nombre: 'Tomás Martínez' }, { nombre: 'Diego Paredes' }]

  it('sin consulta devuelve todo', () => {
    expect(filtrarPorNombre(items, '  ')).toEqual(items)
  })

  it('busca sin tildes y pone primero los que empiezan con la consulta', () => {
    expect(filtrarPorNombre(items, 'mart').map((i) => i.nombre)).toEqual(['Martín Gómez', 'Tomás Martínez'])
  })

  it('devuelve vacío si no hay coincidencias', () => {
    expect(filtrarPorNombre(items, 'xyz')).toEqual([])
  })
})
