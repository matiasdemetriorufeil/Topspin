# Tenis App — Plan de desarrollo

## Resumen y supuestos

Una PWA personal para iPhone que registra partidos de singles, muestra historial, estadísticas, head to head por rival, palmarés de torneos y un ranking personal tipo ELO. Todo se guarda en el teléfono, sin servidor ni cuentas, con backup a archivo.

Secciones de la app (barra inferior): **Inicio**, **Partidos**, **Estadísticas**, **Palmarés** y **Ajustes**.

Supuestos:

- **Resultado por set:** cada set se carga como ganado o perdido, en orden; los games (6-4, 7-6) y el tie-break son opcionales. El orden de los sets es necesario para detectar remontadas.
- **Estados especiales:** completado, walkover (ganado o perdido), suspendido y retiro.
- **Walkovers y suspendidos:** no cuentan para estadísticas ni ranking, pero sí aparecen en el historial. Se puede cambiar con un ajuste.
- **Tipo de partido:** Amistoso o Torneo/Liga. Si es Torneo/Liga, se elige el torneo de una lista y se indica la ronda.
- **Torneos:** se cargan a mano con nombre, fecha, categoría opcional, club y formato (eliminación o liga). El resultado se carga a mano: hasta qué ronda llegué o en qué posición quedé.
- **Palmarés:** muestra los títulos destacados arriba y debajo todas las participaciones.
- **Superficie:** no se registra (solo juego en polvo de ladrillo).
- **Idioma:** todo en español, fechas en formato dd/mm/aaaa.

## Stack tecnológico

| Pieza | Elección | Por qué |
| --- | --- | --- |
| Framework | React + TypeScript + Vite | Rápido de desarrollar, tipado para el modelo de datos |
| Estilos | Tailwind CSS | Mobile-first y modo oscuro sin esfuerzo |
| Base de datos | Dexie (IndexedDB) | Persistente en el teléfono, consultas simples, hooks reactivos con `useLiveQuery` |
| Navegación | React Router | Pantallas y detalle de partido/rival |
| Gráficos | Recharts | Barras por mes, evolución del % y del ranking |
| PWA | vite-plugin-pwa | Manifest, íconos y service worker para uso offline |
| Validación | Zod | Validar el formulario y el archivo de backup al importar |
| Tests | Vitest | Probar las funciones de estadísticas y ranking |
| Hosting | GitHub Pages, Netlify o Vercel (gratis) | El iPhone exige HTTPS para instalar una PWA; los datos igual quedan solo en el teléfono |

## Modelo de datos

Cuatro tablas: rivales, clubes, torneos y partidos. El partido referencia al rival, al club y opcionalmente al torneo.

```typescript
type ID = string; // crypto.randomUUID()

interface Rival { id: ID; nombre: string; creadoEn: string }
interface Club  { id: ID; nombre: string }

interface Torneo {
  id: ID;
  nombre: string;
  fecha: string;            // ISO yyyy-mm-dd
  categoria?: string;
  clubId: ID;
  formato: 'eliminacion' | 'liga';
  // resultado final, cargado a mano
  rondaAlcanzada?: 'campeon' | 'final' | 'semifinal' | 'cuartos' | 'octavos' | '16avos' | 'primera_ronda';
  posicionLiga?: number;    // solo si formato = 'liga'
}

interface SetJugado {
  gane: boolean;
  misGames?: number;
  susGames?: number;
  tiebreak?: { mios: number; suyos: number };
}

interface Partido {
  id: ID;
  fecha: string;            // ISO
  rivalId: ID;
  clubId: ID;
  tipo: 'amistoso' | 'torneo';
  torneoId?: ID;            // requerido si tipo = 'torneo'
  ronda?: string;           // ej. 'Cuartos', 'Fecha 3'
  estado: 'completado' | 'wo_ganado' | 'wo_perdido' | 'suspendido' | 'retiro';
  retiroDe?: 'yo' | 'rival';
  sets: SetJugado[];        // en orden; puede estar vacío en WO
  notas?: string;
  creadoEn: string;
}
```

El resultado (ganado/perdido) se deriva siempre de `estado` y `sets`, nunca se guarda aparte, para que no quede inconsistente al editar.

## Reglas de estadísticas y ranking

| Métrica | Regla |
| --- | --- |
| Ganador del partido | Completado: quien ganó más sets. WO: según el tipo. Retiro: gana quien no se retiró. Suspendido: sin resultado |
| Partidos que cuentan | Completados y retiros. WO y suspendidos quedan fuera (ajuste para incluir WO) |
| % de victorias | Ganados / partidos que cuentan, total y por período |
| Racha actual | Victorias (o derrotas) consecutivas desde el partido más reciente, ordenando por fecha y luego por `creadoEn` |
| Mejor racha | Máxima secuencia de victorias consecutivas en todo el historial |
| Tie-breaks | Sets con 7-6 o 6-7, o con tie-break cargado. Solo cuentan sets con games cargados |
| Remontadas | Partidos ganados habiendo perdido el primer set |
| Partidos por mes | Barras apiladas ganados/perdidos por mes |
| Evolución | % de victorias acumulado y % móvil de los últimos 10 partidos, en línea |
| Head to head | Por rival: G-P, sets a favor y en contra, último resultado y lista de partidos |

**Ranking personal (ELO):**

- Yo y cada rival arrancamos en 1500 puntos.
- Se recalcula completo desde cero recorriendo los partidos en orden cronológico, así editar o borrar un partido viejo siempre da el resultado correcto.
- Probabilidad esperada: E = 1 / (1 + 10^((Rrival − Ryo) / 400)).
- Actualización: Ryo += K × (resultado − E), con resultado 1 o 0, y el rival recibe el ajuste inverso.
- K = 40 en mis primeros 10 partidos, K = 32 después.
- Mostrar el puntaje actual, el máximo histórico y un gráfico de evolución. En cada rival se ve su puntaje estimado.

## Pasos de desarrollo

0. CLAUDE.md con contexto del proyecto
1. Proyecto base, layout con barra inferior de 5 pestañas, safe areas de iPhone y PWA (vite-plugin-pwa)
2. Capa de datos con Dexie, `src/lib/resultado.ts` con tests, `navigator.storage.persist()`, datos de prueba en dev
3. Rivales y clubes (CRUD en Ajustes + componente SelectorConCreacion)
4. Torneos (CRUD con formato y resultado final)
5. Formulario de carga de partido (sets con games opcionales, estados, torneo y ronda)
6. Historial de partidos (agrupado por mes, filtros, detalle, editar/borrar)
7. Lógica de estadísticas en `src/lib/estadisticas.ts` con tests
8. Pantalla de estadísticas con gráficos Recharts
9. Head to head por rival
10. Palmarés (títulos destacados + participaciones + detalle de torneo)
11. Ranking ELO en `src/lib/ranking.ts` con tests
12. Backup JSON/CSV, importación validada, pantalla Inicio
13. Pulido para iPhone y deploy (GitHub Pages o Netlify)

## Instalación en el iPhone

1. Abrir la URL publicada en Safari.
2. Compartir → "Agregar a pantalla de inicio".
3. Abrir siempre desde ese ícono: los datos de la app instalada están separados de los de Safari.

Si se borra la app de la pantalla de inicio, iOS borra sus datos: exportar backup antes.
