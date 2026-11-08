import { useLiveQuery } from 'dexie-react-hooks'
import { useParams } from 'react-router'
import PantallaCargando from '../components/Cargando'
import Encabezado from '../components/Encabezado'
import FormularioTorneo from '../components/FormularioTorneo'
import { torneos } from '../db/repos'
import { useVolver } from '../hooks/useVolver'
import { valoresDesdeTorneo } from '../lib/torneo'

export default function TorneoEditar() {
  const { id = '' } = useParams()
  const volver = useVolver(`/palmares/torneos/${id}`)
  // null mientras carga; undefined si no existe
  const torneo = useLiveQuery(() => torneos.obtener(id), [id], null)
  const atras = { texto: 'Cancelar', onClick: volver }

  if (torneo === null) return <PantallaCargando titulo="Editar torneo" volver={atras} />
  if (torneo === undefined) {
    return (
      <>
        <Encabezado titulo="Torneo no encontrado" volver={{ a: '/palmares', texto: 'Palmarés' }} />
        <p className="text-stone-500 dark:text-stone-400">Puede que lo hayas borrado.</p>
      </>
    )
  }

  return (
    <>
      <Encabezado titulo="Editar torneo" volver={atras} />
      <FormularioTorneo
        // key: si cambia el id, el formulario arranca de cero con los datos nuevos
        key={torneo.id}
        inicial={valoresDesdeTorneo(torneo)}
        onGuardar={async (datos) => {
          await torneos.reemplazar(torneo.id, datos)
          volver()
        }}
      />
    </>
  )
}
