import { useLiveQuery } from 'dexie-react-hooks'
import { ajustes } from '../db/repos'
import type { Ajustes } from '../db/schema'

/** Ajustes guardados en la base; undefined mientras carga. */
export function useAjustes(): Ajustes | undefined {
  return useLiveQuery(() => ajustes.obtener())
}
