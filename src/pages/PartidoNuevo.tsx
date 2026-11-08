import { useLiveQuery } from 'dexie-react-hooks'
import { Cargando } from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import FormularioPartido from '../components/FormularioPartido'
import { partidos } from '../db/repos'
import { useVolver } from '../hooks/useVolver'
import { hoyISO } from '../lib/fechas'
import { setVacio } from '../lib/partido'

export default function PartidoNuevo() {
  const volver = useVolver('/partidos')
  // null mientras carga; undefined si todavía no hay partidos
  const ultimoClub = useLiveQuery(() => partidos.ultimoClubUsado(), [], null)
  const encabezado = <Encabezado titulo="Nuevo partido" volver={{ texto: 'Cancelar', onClick: volver }} />

  if (ultimoClub === null) {
    return (
      <>
        {encabezado}
        <Cargando />
      </>
    )
  }

  return (
    <>
      {encabezado}
      <FormularioPartido
        inicial={{
          fecha: hoyISO(),
          rivalId: '',
          clubId: ultimoClub ?? '',
          tipo: 'amistoso',
          torneoId: '',
          ronda: '',
          estado: 'completado',
          retiroDe: '',
          sets: [setVacio(), setVacio()],
          notas: '',
        }}
        onGuardar={async (datos) => {
          await partidos.crear(datos)
          volver()
        }}
      />
    </>
  )
}
