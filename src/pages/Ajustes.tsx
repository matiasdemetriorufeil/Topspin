import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import BotonDatosPrueba from '../components/BotonDatosPrueba'
import Encabezado from '../components/Encabezado'
import Interruptor from '../components/Interruptor'
import ListaEditable from '../components/ListaEditable'
import SeccionBackup from '../components/SeccionBackup'
import SeccionVersion from '../components/SeccionVersion'
import { ajustes, clubes, rivales } from '../db/repos'
import { useAjustes } from '../hooks/useAjustes'

export default function Ajustes() {
  const listaRivales = useLiveQuery(() => rivales.listar())
  const listaClubes = useLiveQuery(() => clubes.listar())
  const conf = useAjustes()
  const { hash } = useLocation()

  // El aviso de Inicio lleva a /ajustes#backup: React Router no hace scroll al ancla solo
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <>
      <Encabezado titulo="Ajustes" />

      <section aria-labelledby="titulo-estadisticas">
        <h2 id="titulo-estadisticas" className="mb-2 text-lg font-semibold">
          Estadísticas
        </h2>
        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <Interruptor
            etiqueta="Incluir walkovers en estadísticas"
            descripcion="Los WO cuentan como victoria o derrota en el % de victorias, las rachas y el ranking."
            activado={conf?.incluirWO ?? false}
            onChange={(v) => ajustes.guardar('incluirWO', v)}
          />
        </div>
      </section>

      <SeccionBackup />

      <ListaEditable
        titulo="Rivales"
        nuevoPlaceholder="Nuevo rival"
        vacio="Todavía no cargaste rivales."
        items={listaRivales}
        onCrear={(nombre) => rivales.crear({ nombre })}
        onRenombrar={(id, nombre) => rivales.actualizar(id, { nombre })}
        onBorrar={rivales.borrar}
      />

      <ListaEditable
        titulo="Clubes"
        nuevoPlaceholder="Nuevo club"
        vacio="Todavía no cargaste clubes."
        items={listaClubes}
        onCrear={(nombre) => clubes.crear({ nombre })}
        onRenombrar={(id, nombre) => clubes.actualizar(id, { nombre })}
        onBorrar={clubes.borrar}
      />

      <SeccionVersion />

      {import.meta.env.DEV && <BotonDatosPrueba />}
    </>
  )
}
