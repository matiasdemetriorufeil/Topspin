import { BarChart3, Home, ListOrdered, Settings, Trophy, type LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'

const pestanas: { to: string; label: string; Icono: LucideIcon }[] = [
  { to: '/', label: 'Inicio', Icono: Home },
  { to: '/partidos', label: 'Partidos', Icono: ListOrdered },
  { to: '/estadisticas', label: 'Estadísticas', Icono: BarChart3 },
  { to: '/palmares', label: 'Palmarés', Icono: Trophy },
  { to: '/ajustes', label: 'Ajustes', Icono: Settings },
]

export default function BarraNavegacion() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-stone-200 bg-white/90 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
      <ul className="mx-auto flex h-16 max-w-xl">
        {pestanas.map(({ to, label, Icono }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium ${
                  isActive
                    ? 'text-lona-600 dark:text-lona-500'
                    : 'text-stone-500 dark:text-stone-400'
                }`
              }
            >
              <Icono className="size-6" aria-hidden />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
