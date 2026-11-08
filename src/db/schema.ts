import { Dexie, type EntityTable } from 'dexie'

export type ID = string // crypto.randomUUID()

export interface Rival {
  id: ID
  nombre: string
  creadoEn: string
}

export interface Club {
  id: ID
  nombre: string
}

export type RondaAlcanzada =
  | 'campeon'
  | 'final'
  | 'semifinal'
  | 'cuartos'
  | 'octavos'
  | '16avos'
  | 'primera_ronda'

export interface Torneo {
  id: ID
  nombre: string
  fecha: string // ISO yyyy-mm-dd
  categoria?: string
  clubId: ID
  formato: 'eliminacion' | 'liga'
  // resultado final, cargado a mano
  rondaAlcanzada?: RondaAlcanzada
  posicionLiga?: number // solo si formato = 'liga'
}

export interface SetJugado {
  gane: boolean
  misGames?: number
  susGames?: number
  tiebreak?: { mios: number; suyos: number }
}

export type EstadoPartido = 'completado' | 'wo_ganado' | 'wo_perdido' | 'suspendido' | 'retiro'

export interface Partido {
  id: ID
  fecha: string // ISO yyyy-mm-dd
  rivalId: ID
  clubId: ID
  tipo: 'amistoso' | 'torneo'
  torneoId?: ID // requerido si tipo = 'torneo'
  ronda?: string // ej. 'Cuartos', 'Fecha 3'
  estado: EstadoPartido
  retiroDe?: 'yo' | 'rival'
  sets: SetJugado[] // en orden; puede estar vacío en WO
  notas?: string
  creadoEn: string
}

/** Preferencias de la app, guardadas como pares clave → valor. */
export interface Ajustes {
  /** Los walkovers cuentan para estadísticas y ranking */
  incluirWO: boolean
  /** ISO timestamp del último backup exportado */
  ultimoBackup?: string
}

export const AJUSTES_POR_DEFECTO: Ajustes = { incluirWO: false }

export interface FilaAjuste {
  clave: keyof Ajustes
  valor: Ajustes[keyof Ajustes]
}

export class TenisDB extends Dexie {
  rivales!: EntityTable<Rival, 'id'>
  clubes!: EntityTable<Club, 'id'>
  torneos!: EntityTable<Torneo, 'id'>
  partidos!: EntityTable<Partido, 'id'>
  ajustes!: EntityTable<FilaAjuste, 'clave'>

  constructor() {
    super('mi-tenis')
    this.version(1).stores({
      rivales: 'id, nombre',
      clubes: 'id, nombre',
      torneos: 'id, fecha, clubId',
      // [fecha+creadoEn] da el orden cronológico estable que usan rachas y ranking
      partidos: 'id, fecha, [fecha+creadoEn], rivalId, clubId, torneoId',
    })
    // v2: tabla de ajustes. Las tablas existentes no cambian.
    this.version(2).stores({
      ajustes: 'clave',
    })
  }
}

export const db = new TenisDB()
