import { useEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router'
import AvisoActualizacion from './AvisoActualizacion'
import BarraNavegacion from './BarraNavegacion'

export default function Layout() {
  const { pathname, hash } = useLocation()
  const tipoNavegacion = useNavigationType()

  // Al entrar a una pantalla nueva, arriba de todo; al volver atrás (POP), el navegador restaura la posición
  useEffect(() => {
    if (tipoNavegacion !== 'POP' && !hash) window.scrollTo(0, 0)
  }, [pathname, hash, tipoNavegacion])

  return (
    <div className="min-h-dvh pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
      {/* 4rem = alto de la barra inferior */}
      <main className="mx-auto max-w-xl px-4 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)]">
        {/* key: cada pantalla entra con un fundido corto (solo opacidad: un transform rompería los position: fixed) */}
        <div key={pathname} className="animate-entrada">
          <Outlet />
        </div>
      </main>
      <AvisoActualizacion />
      <BarraNavegacion />
    </div>
  )
}
