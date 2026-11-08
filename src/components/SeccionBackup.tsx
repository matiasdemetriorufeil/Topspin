import { useLiveQuery } from 'dexie-react-hooks'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { ajustes, clubes, datosCompletos, mensajeDeError } from '../db/repos'
import { useAjustes } from '../hooks/useAjustes'
import { crearBackup, diasEntre, leerBackup, nombreArchivo, resumenDatos, type Backup } from '../lib/backup'
import { partidosACsv } from '../lib/csv'
import { formatearFecha, hoyISO } from '../lib/fechas'
import { guardarArchivo } from '../utils/archivos'
import { claseBotonPrimario, claseError } from './estilos'

const claseBotonSecundario =
  'flex h-11 items-center justify-center gap-2 rounded-lg border border-stone-300 font-medium active:bg-stone-100 disabled:opacity-40 dark:border-stone-700 dark:active:bg-stone-800'

type Estado =
  | { tipo: 'nada' }
  | { tipo: 'mensaje'; texto: string }
  | { tipo: 'error'; texto: string }
  | { tipo: 'confirmar'; backup: Backup }

export default function SeccionBackup() {
  const conf = useAjustes()
  // Datos ya cargados: al tocar "Exportar" el archivo se arma sin esperar a la base (ver guardarArchivo)
  const datos = useLiveQuery(() => datosCompletos.exportar())
  const nombresClubes = useLiveQuery(async () => new Map((await clubes.listar()).map((c) => [c.id, c.nombre])))
  const [estado, setEstado] = useState<Estado>({ tipo: 'nada' })
  const [importando, setImportando] = useState(false)
  const inputArchivo = useRef<HTMLInputElement>(null)

  const listo = datos !== undefined && conf !== undefined && nombresClubes !== undefined

  async function exportarBackup() {
    if (!datos || !conf) return
    const ahora = new Date()
    const json = JSON.stringify(crearBackup(datos, { incluirWO: conf.incluirWO }, ahora), null, 2)
    const r = await guardarArchivo(json, nombreArchivo('backup', ahora, 'json'), 'application/json')
    if (r === 'cancelado') return
    await ajustes.guardar('ultimoBackup', ahora.toISOString())
    setEstado({ tipo: 'mensaje', texto: `Backup exportado: ${resumenDatos(datos)}.` })
  }

  async function exportarCsv() {
    if (!datos || !nombresClubes) return
    const csv = partidosACsv(datos.partidos, {
      rivales: new Map(datos.rivales.map((r) => [r.id, r.nombre])),
      clubes: nombresClubes,
      torneos: new Map(datos.torneos.map((t) => [t.id, t])),
    })
    const r = await guardarArchivo(csv, nombreArchivo('partidos', new Date(), 'csv'), 'text/csv')
    if (r !== 'cancelado') setEstado({ tipo: 'mensaje', texto: 'CSV de partidos exportado.' })
  }

  async function elegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    e.target.value = '' // para poder elegir el mismo archivo otra vez
    if (!archivo) return
    const r = leerBackup(await archivo.text())
    setEstado(r.ok ? { tipo: 'confirmar', backup: r.backup } : { tipo: 'error', texto: r.error })
  }

  async function confirmarImportacion(backup: Backup) {
    setImportando(true)
    try {
      await datosCompletos.reemplazarTodo(backup)
      setEstado({ tipo: 'mensaje', texto: `Backup importado: ${resumenDatos(backup.datos)}.` })
    } catch (err) {
      setEstado({ tipo: 'error', texto: mensajeDeError(err, 'No se pudo importar el backup. Tus datos no cambiaron.') })
    } finally {
      setImportando(false)
    }
  }

  return (
    <section id="backup" aria-labelledby="titulo-backup" className="mt-6 scroll-mt-4">
      <h2 id="titulo-backup" className="mb-1 text-lg font-semibold">
        Backup
      </h2>
      <p className="mb-3 text-sm text-stone-500 dark:text-stone-400">
        Tus datos viven solo en este teléfono. Si borrás la app, se pierden: guardá un backup en Archivos o iCloud.
      </p>
      {conf && (
        <p className="mb-3 text-sm">
          {conf.ultimoBackup ? (
            <>
              Último backup: <span className="font-medium">{formatearFecha(hoyISO(new Date(conf.ultimoBackup)))}</span>
              <span className="text-stone-500 dark:text-stone-400"> ({textoHace(diasEntre(new Date(conf.ultimoBackup), new Date()))})</span>
            </>
          ) : (
            <span className="text-amber-700 dark:text-amber-400">Todavía no hiciste ningún backup.</span>
          )}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={exportarBackup} disabled={!listo} className={claseBotonPrimario}>
          <Download aria-hidden className="size-5" />
          Exportar backup
        </button>
        <button type="button" onClick={exportarCsv} disabled={!listo} className={claseBotonSecundario}>
          <FileSpreadsheet aria-hidden className="size-5" />
          Exportar partidos a CSV
        </button>
        <button type="button" onClick={() => inputArchivo.current?.click()} className={claseBotonSecundario}>
          <Upload aria-hidden className="size-5" />
          Importar backup
        </button>
        <input
          ref={inputArchivo}
          type="file"
          accept="application/json,.json"
          onChange={elegirArchivo}
          className="hidden"
          aria-hidden
          tabIndex={-1}
        />
      </div>

      {estado.tipo === 'mensaje' && (
        <p role="status" className="mt-3 text-sm text-lona-600 dark:text-lona-500">
          {estado.texto}
        </p>
      )}
      {estado.tipo === 'error' && (
        <p role="alert" className={claseError}>
          {estado.texto}
        </p>
      )}
      {estado.tipo === 'confirmar' && datos && (
        <div role="alertdialog" aria-labelledby="confirmar-titulo" className="mt-3 rounded-xl border border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/30">
          <p id="confirmar-titulo" className="font-semibold">
            ¿Reemplazar todos tus datos?
          </p>
          <p className="mt-1 text-sm">
            El backup del {formatearFecha(hoyISO(new Date(estado.backup.exportadoEn)))} tiene{' '}
            <span className="font-medium">{resumenDatos(estado.backup.datos)}</span>.
          </p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            Se van a borrar los datos actuales ({resumenDatos(datos)}). No se puede deshacer.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setEstado({ tipo: 'nada' })} disabled={importando} className={claseBotonSecundario}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => confirmarImportacion(estado.backup)}
              disabled={importando}
              className="flex h-11 items-center justify-center rounded-lg bg-red-600 font-medium text-white active:bg-red-700 disabled:opacity-40"
            >
              {importando ? 'Importando…' : 'Reemplazar todo'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function textoHace(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  return `hace ${dias} días`
}
