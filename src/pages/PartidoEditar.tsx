import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import FormularioPartido from '../components/FormularioPartido'
import { partidos } from '../db/repos'
import { useVolver } from '../hooks/useVolver'
import { valoresDesdePartido } from '../lib/partido'

export default function PartidoEditar() {
  const { id = '' } = useParams()
  const volver = useVolver('/partidos')
  // null mientras carga; undefined si no existe
  const partido = useLiveQuery(() => partidos.obtener(id), [id], null)
  const atras = { texto: 'Cancelar', onClick: volver }

  if (partido === null) return <PantallaCargando titulo="Editar partido" volver={atras} />
  if (partido === undefined) {
    return (
      <>
        <Encabezado titulo="Partido no encontrado" volver={atras} />
        <p className="text-stone-500 dark:text-stone-400">Puede que lo hayas borrado.</p>
      </>
    )
  }

  return (
    <>
      <Encabezado titulo="Editar partido" volver={atras} />
      <FormularioPartido
        key={partido.id}
        partidoId={partido.id}
        inicial={valoresDesdePartido(partido)}
        onGuardar={async (datos) => {
          await partidos.reemplazar(partido.id, datos)
          volver()
        }}
      />
    </>
  )
}
