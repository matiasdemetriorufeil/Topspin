const pad = (n: number) => String(n).padStart(2, '0')

/** 'yyyy-mm-dd' → 'dd/mm/aaaa'. Devuelve el texto tal cual si no tiene ese formato. */
export function formatearFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** Fecha local de hoy en ISO yyyy-mm-dd (no UTC: a la noche en Argentina, UTC ya es mañana). */
export function hoyISO(ahora = new Date()): string {
  return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`
}
