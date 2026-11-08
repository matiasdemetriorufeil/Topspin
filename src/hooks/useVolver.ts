import { useLocation, useNavigate } from 'react-router'

/**
 * Vuelve a la pantalla anterior (ej. Inicio o Partidos, según desde dónde se abrió).
 * Si la página se abrió directo por URL no hay historial dentro de la app,
 * así que va a `porDefecto`.
 */
export function useVolver(porDefecto: string) {
  const navigate = useNavigate()
  const location = useLocation()
  return () => (location.key === 'default' ? navigate(porDefecto, { replace: true }) : navigate(-1))
}
