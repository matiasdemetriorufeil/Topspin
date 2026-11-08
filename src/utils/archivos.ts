export type ResultadoGuardar = 'compartido' | 'descargado' | 'cancelado'

/**
 * En el celular abre la hoja de compartir (en iPhone: "Guardar en Archivos",
 * iCloud, AirDrop…); en la compu o si no se puede compartir, descarga el archivo.
 *
 * Llamarla directo desde el toque del usuario, sin awaits antes: Safari
 * rechaza navigator.share si el gesto ya "venció".
 */
export async function guardarArchivo(contenido: string, nombre: string, tipo: string): Promise<ResultadoGuardar> {
  const archivo = new File([contenido], nombre, { type: tipo })
  const esTactil = window.matchMedia('(pointer: coarse)').matches

  if (esTactil && navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre })
      return 'compartido'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelado'
      // Cualquier otro error (ej. NotAllowedError): probamos con la descarga
    }
  }

  const url = URL.createObjectURL(archivo)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'descargado'
}
