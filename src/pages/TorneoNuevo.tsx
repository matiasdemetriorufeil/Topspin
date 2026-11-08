import { useNavigate } from 'react-router'
import Encabezado from '../components/Encabezado'
import FormularioTorneo from '../components/FormularioTorneo'
import { torneos } from '../db/repos'
import { useVolver } from '../hooks/useVolver'
import { hoyISO } from '../lib/fechas'

export default function TorneoNuevo() {
  const navigate = useNavigate()
  const volver = useVolver('/palmares')

  return (
    <>
      <Encabezado titulo="Nuevo torneo" volver={{ texto: 'Cancelar', onClick: volver }} />
      <FormularioTorneo
        inicial={{
          nombre: '',
          fecha: hoyISO(),
          categoria: '',
          clubId: '',
          formato: 'eliminacion',
          rondaAlcanzada: '',
          posicionLiga: '',
        }}
        onGuardar={async (datos) => {
          const torneo = await torneos.crear(datos)
          // El formulario se reemplaza por el detalle: "volver" desde ahí va a Palmarés
          navigate(`/palmares/torneos/${torneo.id}`, { replace: true })
        }}
      />
    </>
  )
}
