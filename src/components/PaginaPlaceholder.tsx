export default function PaginaPlaceholder({ titulo }: { titulo: string }) {
  return (
    <>
      <h1 className="pt-6 pb-4 text-3xl font-bold">{titulo}</h1>
      <p className="text-stone-500 dark:text-stone-400">Próximamente.</p>
    </>
  )
}
