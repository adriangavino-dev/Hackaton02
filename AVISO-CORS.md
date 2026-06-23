# Aviso: bug de CORS en el backend desplegado — bloquea el PATCH de señales (CP4)

> Para el profesor / TA. Afecta a **todos los equipos** en la evaluación.

## Resumen

El navegador bloquea el `PATCH /api/v1/signals/:id/status` (Checkpoint 4, "atender una
señal") cuando el frontend desplegado llama al backend desplegado (petición
*cross-origin*).

- **Backend:** `https://hackaton-20261-front-587720740455.us-east1.run.app`
- **Síntoma:** el *preflight* CORS no incluye `PATCH` en los métodos permitidos.

## Causa

`@fastify/cors` (v11) trae por defecto `methods: 'GET,HEAD,POST'`. En `src/app.ts`, el
`app.register(cors, { … })` solo configura `origin`, no `methods`. Por eso el navegador
nunca recibe permiso para usar `PATCH`.

## Evidencia

Preflight contra el backend desplegado:

```
> OPTIONS /api/v1/signals/x/status
> Origin: https://<frontend>.vercel.app
> Access-Control-Request-Method: PATCH

< HTTP/1.1 204 No Content
< access-control-allow-origin: https://<frontend>.vercel.app
< access-control-allow-methods: GET,HEAD,POST      ← falta PATCH
```

El `origin` sí está permitido (el patrón `*.vercel.app` funciona); el problema es
únicamente el método. GET/POST (login, dashboard, tropeles, feed, detalle, sectores,
story) funcionan; solo el PATCH de CP4 queda bloqueado por el navegador.

## Fix (1 línea)

En `src/app.ts`, dentro del `app.register(cors, { … })`:

```ts
await app.register(cors, {
  origin(origin, callback) {
    /* … sin cambios … */
  },
  methods: ['GET', 'HEAD', 'POST', 'PATCH'], // ← agregar esto
});
```

Opcional, más completo:

```ts
methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
```

## Verificación tras el redeploy

```bash
curl -i -X OPTIONS https://<backend>/api/v1/signals/x/status \
  -H "Origin: https://<frontend>.vercel.app" \
  -H "Access-Control-Request-Method: PATCH"
# Debe responder: access-control-allow-methods: GET,HEAD,POST,PATCH
```

## Nota

En desarrollo local no se nota porque el frontend usa el proxy de Vite (mismo origen).
En el deploy (cross-origin) sí rompe CP4. El resto de checkpoints (CP1, CP2, CP3, CP5)
funciona en producción sin cambios.
