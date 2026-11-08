/** 66.67 → '67%'; null (sin partidos) → '—' */
export const formatearPorcentaje = (p: number | null) => (p === null ? '—' : `${Math.round(p)}%`)

/** Racha para mostrar en una tarjeta: valor grande + detalle. */
export function textoRacha(racha: { tipo: 'victorias' | 'derrotas'; cantidad: number } | null): {
  valor: string
  detalle: string
} {
  if (!racha) return { valor: '—', detalle: 'Sin partidos' }
  const { tipo, cantidad } = racha
  const detalle =
    tipo === 'victorias'
      ? cantidad === 1 ? 'victoria' : 'victorias seguidas'
      : cantidad === 1 ? 'derrota' : 'derrotas seguidas'
  return { valor: String(cantidad), detalle }
}

/** Variación de ranking redondeada: "+14 pts", "-9 pts", "0 pts". */
export function formatearDelta(delta: number): string {
  const n = Math.round(delta)
  return `${n > 0 ? '+' : ''}${n === 0 ? 0 : n} pts`
}

/** Puntaje de ranking redondeado: 1537.7 → "1538". */
export const formatearPuntaje = (p: number) => String(Math.round(p))
