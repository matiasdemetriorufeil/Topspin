import { useId, type ReactNode } from 'react'
import { claseError, claseEtiqueta } from './estilos'

interface PropsControl {
  id: string
  'aria-invalid': boolean
  'aria-describedby'?: string
}

/** Etiqueta + control + error, con los ids de accesibilidad conectados. */
export default function Campo({
  etiqueta,
  error,
  children,
}: {
  etiqueta: string
  error?: string
  children: (props: PropsControl) => ReactNode
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={claseEtiqueta}>
        {etiqueta}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined })}
      {error && (
        <p id={`${id}-error`} data-error className={claseError}>
          {error}
        </p>
      )}
    </div>
  )
}
