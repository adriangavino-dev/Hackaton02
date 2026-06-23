# TropelCare Control Room — Pizza Protocol

Consola operativa en **React + TypeScript** para gestionar Tropeles, Señales y la
historia de los sectores de la colonia digital de Tuckersoft. Construida para la
hackathon frontend (5 checkpoints, evaluación todo-o-nada).

## Integrantes

| Nombre | Código |
|:-------|:-------|
| _Adrian Piero Gavino Navarrete_ | _202510483_ |
| _Nestor Alonso De La Cruz Gomez_ | _202420110_ |

## Stack

- React 18 + TypeScript estricto (sin `any` para respuestas de API)
- Vite 5
- React Router 6
- Tailwind CSS 3
- Fetch API (cliente propio con manejo de auth, errores y `AbortSignal`)

No se usan: Material UI / Chakra / etc., ni React Query / SWR / TanStack, ni
librerías de infinite scroll o cache de servidor. Toda la paginación, el cursor y
el scroll infinito son propios.

## Comandos

```bash
npm install            # instalar dependencias

npm run dev            # frontend en :5173, proxy de /api -> backend (VITE_PROXY_TARGET)

npm run typecheck      # tsc -b --noEmit  (debe pasar sin errores)
npm run build          # tsc -b && vite build  (debe pasar sin errores)
npm run preview        # previsualizar el build

# Opcional (sin internet): mock backend local determinista
npm run dev:all        # mock en :8787 + Vite en :5173 (apunta VITE_PROXY_TARGET a :8787)
```

El dev server hace proxy de `/api` hacia el **backend desplegado** (`VITE_PROXY_TARGET`),
evitando CORS en local. Login: usa el `TEAM_CODE` y password de tu equipo
(`operator@tuckersoft.com`, password con formato `Pizza-<TEAM_CODE>`).

## Variables de entorno

Copia `.env.example` a `.env` y ajusta:

```properties
# Desarrollo: usar el proxy de Vite (mismo origen, sin CORS).
VITE_API_BASE_URL=/api/v1
VITE_PROXY_TARGET=https://hackaton-20261-front-587720740455.us-east1.run.app

# Solo para autocompletar el login en desarrollo (ajusta a tu equipo).
VITE_TEAM_CODE=TEAM-001
VITE_EMAIL=operator@tuckersoft.com
VITE_PASSWORD=Pizza-TEAM-001
```

> **Producción (Vercel):** `VITE_API_BASE_URL=/api/v1` (relativo). El `vercel.json`
> reescribe `/api/*` hacia el backend como **proxy de servidor** (mismo origen para el
> navegador), igual que el proxy de Vite en local.
>
> ℹ️ **Por qué el proxy en producción:** el backend responde
> `Access-Control-Allow-Methods: GET,HEAD,POST` (sin PATCH), así que un `PATCH`
> cross-origin directo lo bloquea el navegador y rompe CP4. Al pasar todo por el proxy
> de Vercel (mismo origen) **no hay CORS** y el PATCH funciona. Ver [`AVISO-CORS.md`](AVISO-CORS.md).

## Deploy

- **Vercel:** `vercel.json` incluye el rewrite SPA (abre directo en cualquier ruta) y
  el proxy de `/api/*` al backend. Env var: `VITE_API_BASE_URL=/api/v1`.
- **Netlify:** `netlify.toml` + `public/_redirects` configuran build y SPA fallback.
  Definir `VITE_API_BASE_URL`.

**Link del deploy:** https://tropelcare-control-room.vercel.app

## Checkpoints — dónde está cada cosa

| CP | Qué | Archivos clave |
|:--:|:----|:---------------|
| 1 | Login, ruta privada, restauración de sesión, logout, dashboard | `src/auth/*`, `src/features/dashboard/DashboardPage.tsx` |
| 2 | Atlas de Tropeles: paginación server, filtros/búsqueda/orden en URL, anti-race | `src/features/tropels/*` |
| 3 | Feed infinito por cursor: dedup, una carga en vuelo, cancelación, posición | `src/features/signals/useSignalFeed.ts`, `SignalsFeedPage.tsx`, `feedStore.ts` |
| 4 | Detalle y atender Señal: PATCH, loading/error, reflejo en feed | `src/features/signals/SignalDetailPage.tsx` |
| 5 | Sector Story Engine: scrollytelling, scroll-driven anims, View Transitions | `src/features/sectors/SectorStoryPage.tsx`, `useActiveStage.ts`, `story.css` |

## Decisiones técnicas

- **Estado de la vista en la URL (CP2/CP3):** la URL es la fuente de verdad de
  filtros, búsqueda, orden y página. Recargar o compartir la URL restaura el estado
  exacto. Implementado con `useSearchParams` y parsers que validan enums.
- **Protección anti-race (CP2):** cada request lleva un id incremental
  (`latestRequestId`) y solo se aplica la respuesta más reciente; la anterior se
  aborta con `AbortController`. Evita que una respuesta vieja pise a una nueva.
- **Feed por cursor (CP3):** una sola carga en vuelo (`loadingRef`), deduplicación
  por `id` con `Set`, descarte de respuestas obsoletas por *generación* al cambiar
  filtros, y `IntersectionObserver` con `rootMargin` para auto-cargar. La posición y
  las páginas cargadas se conservan en una caché de módulo (`feedStore`) al abrir y
  cerrar el detalle.
- **Atender señal (CP4):** la mutación es independiente de la carga del detalle; el
  botón se deshabilita en vuelo, se muestra confirmación, y ante error se conserva el
  estado previo. El cambio se propaga a la caché del feed (`patchSignalEverywhere`)
  para verse al volver.
- **Sector Story Engine (CP5):** mejora progresiva. La etapa activa, el visual
  persistente, las métricas y el progreso se calculan **siempre** con
  `IntersectionObserver` + scroll (funciona en todo navegador). Encima, si el
  navegador soporta **CSS Scroll-driven Animations** (`animation-timeline`), se
  activan animaciones ligadas al scroll vía `@supports`; si no, el contenido queda
  visible (fallback). La transición resumen↔historia usa **View Transition API**
  cuando existe y un cambio directo cuando no. Todo respeta
  `prefers-reduced-motion` y es navegable por teclado (flechas, Home/End, dots).
- **Tipado estricto del contrato:** los DTOs viven en `src/lib/types.ts` y no se usa
  `any` para respuestas de API. Errores normalizados con la clase `ApiError`.
- **Mock backend (solo dev):** `mock-server/server.mjs` implementa el contrato
  congelado de forma determinística (paginación real, cursor opaco con hash de
  filtros, escenarios de delay/error) para desarrollar y verificar sin el backend en
  vivo. **No es parte del entregable de runtime**: en producción se usa la API real.

## Estructura

```
src/
  auth/            AuthContext, LoginPage, ProtectedRoute
  components/      Layout, estados (loading/error/empty), 404
  features/
    dashboard/     DashboardPage (CP1)
    tropels/       Atlas + paginación + URL state + anti-race (CP2)
    signals/       Feed infinito + detalle + PATCH (CP3, CP4)
    sectors/       Lista + Sector Story Engine (CP5)
  lib/             apiClient, api, types, env, hooks, capabilities
mock-server/       backend mock determinístico (solo desarrollo)
```
