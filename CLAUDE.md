# Topspin

PWA personal para iPhone que registra mis partidos de tenis de singles y muestra historial, estadísticas, head to head por rival, palmarés de torneos y un ranking personal tipo ELO. Todo se guarda en el teléfono (IndexedDB), sin servidor ni cuentas, con backup a archivo.

El resumen, el modelo de datos, las reglas de estadísticas y los pasos de desarrollo están en [PLAN.md](PLAN.md). Ante cualquier duda sobre cómo se calcula algo, PLAN.md manda.

## Secciones (barra inferior)

1. **Inicio**: ranking actual, racha, % del año, partidos del mes, últimos 5 partidos, aviso si pasaron más de 30 días sin backup y botón "Nuevo partido".
2. **Partidos**: historial agrupado por mes, con filtros, detalle, edición y borrado, más el formulario de carga. Cada set se carga en orden como ganado o perdido; los games y el tie-break son opcionales. Estados: completado, walkover (ganado o perdido), suspendido y retiro. Tipo: amistoso o torneo/liga (con torneo y ronda). Los walkovers y suspendidos aparecen en el historial aunque no cuenten para estadísticas.
3. **Estadísticas**: % de victorias, racha actual y mejor racha, tie-breaks, remontadas, partidos por mes y evolución del %, con gráficos Recharts. También el head to head por rival y el ranking ELO (puntaje actual, máximo histórico y evolución).
4. **Palmarés**: títulos destacados arriba y debajo todas las participaciones en torneos, con detalle de cada torneo.
5. **Ajustes**: alta, edición y borrado de rivales y clubes; ajuste para que los walkovers cuenten en las estadísticas; backup JSON/CSV e importación validada con Zod.

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Dexie (IndexedDB)
- React Router
- Recharts
- vite-plugin-pwa
- Zod (validación de datos e importaciones)
- Vitest

## Convenciones

- **UI en español.** Todos los textos visibles al usuario van en español.
- **Fechas en formato dd/mm/aaaa** en la UI.
- **Mobile-first, pensado para iPhone**: respetar safe areas (`env(safe-area-inset-*)`), objetivos táctiles de al menos 44px (`h-11`), navegación al alcance del pulgar.
- **Campos con 16px o más** (`claseCampo` en `src/components/estilos.ts` ya trae `text-base`) para que iOS no haga zoom; números con `inputMode="numeric"`.
- **Rutas siempre relativas al router** (`<Link to="/partidos">`), nunca URLs absolutas armadas a mano: en GitHub Pages la app vive en `/<repo>/`.
- **Modo oscuro por defecto siguiendo el sistema** (`prefers-color-scheme`).
- **Solo componentes funcionales** con hooks.
- **Lógica de estadísticas en funciones puras dentro de `src/lib`**, sin dependencias de React ni de Dexie, y cada una con sus tests en Vitest.

## Comandos

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción
npm run test    # tests con Vitest (una corrida; test:watch para modo watch)
npm run lint    # ESLint
npm run generate-pwa-assets  # regenera íconos desde public/logo.svg
```

TypeScript está fijado en ~6.0 porque typescript-eslint todavía no soporta TS 7.

## Deploy

GitHub Pages con `.github/workflows/deploy.yml`: cada push a `main` corre lint, tests y build, y publica. El workflow pasa `BASE_PATH=/<repo>/` (Vite `base`, manifest y `basename` del router lo toman de ahí) y copia `index.html` a `404.html` para que funcionen los links directos. La versión que se muestra en Ajustes sale de `version` en `package.json`: subirla al publicar cambios.
