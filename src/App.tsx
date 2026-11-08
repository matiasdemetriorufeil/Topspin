import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import PantallaCargando from './components/Cargando'
import Layout from './components/Layout'
import Ajustes from './pages/Ajustes'
import Inicio from './pages/Inicio'
import Palmares from './pages/Palmares'
import PartidoDetalle from './pages/PartidoDetalle'
import PartidoEditar from './pages/PartidoEditar'
import PartidoNuevo from './pages/PartidoNuevo'
import Partidos from './pages/Partidos'
import RivalDetalle from './pages/RivalDetalle'
import TorneoDetalle from './pages/TorneoDetalle'
import TorneoEditar from './pages/TorneoEditar'
import TorneoNuevo from './pages/TorneoNuevo'

// Recharts pesa ~400 kB: se carga recién al abrir Estadísticas (sigue precacheado para offline)
const Estadisticas = lazy(() => import('./pages/Estadisticas'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="partidos" element={<Partidos />} />
        <Route path="partidos/nuevo" element={<PartidoNuevo />} />
        <Route path="partidos/:id" element={<PartidoDetalle />} />
        <Route path="partidos/:id/editar" element={<PartidoEditar />} />
        <Route
          path="estadisticas"
          element={
            <Suspense fallback={<PantallaCargando titulo="Estadísticas" />}>
              <Estadisticas />
            </Suspense>
          }
        />
        <Route path="estadisticas/rivales/:id" element={<RivalDetalle />} />
        <Route path="palmares" element={<Palmares />} />
        <Route path="palmares/torneos/nuevo" element={<TorneoNuevo />} />
        <Route path="palmares/torneos/:id" element={<TorneoDetalle />} />
        <Route path="palmares/torneos/:id/editar" element={<TorneoEditar />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
