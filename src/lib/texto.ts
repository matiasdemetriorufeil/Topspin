/** Saca espacios de los bordes y colapsa los repetidos. Es la forma en que se guardan los nombres. */
export function limpiarNombre(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ')
}

/**
 * Clave para comparar nombres: sin mayúsculas ni tildes ni diéresis.
 * La ñ se conserva porque es otra letra (Muñoz ≠ Munoz).
 */
export function normalizar(nombre: string): string {
  return limpiarNombre(nombre)
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, (marca, i: number, s: string) =>
      marca === '̃' && s[i - 1] === 'n' ? marca : '',
    )
    .normalize('NFC')
}

export function mismoNombre(a: string, b: string): boolean {
  return normalizar(a) === normalizar(b)
}

/** Filtra por coincidencia parcial; primero los que empiezan con la consulta. */
export function filtrarPorNombre<T extends { nombre: string }>(items: T[], consulta: string): T[] {
  const q = normalizar(consulta)
  if (!q) return items
  const empiezan: T[] = []
  const contienen: T[] = []
  for (const item of items) {
    const n = normalizar(item.nombre)
    if (n.startsWith(q)) empiezan.push(item)
    else if (n.includes(q)) contienen.push(item)
  }
  return [...empiezan, ...contienen]
}
