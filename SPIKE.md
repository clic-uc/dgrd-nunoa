# Spike — Sistema DGRD Ñuñoa fuera del mockup

Esta rama implementa el sistema completo del mockup de diseño
(`Sistema DGRD Ñuñoa - Standalone.html`) como una aplicación Next.js real,
para poder probarlo con datos persistidos y usuarios de verdad.

## Qué se portó

Las 13 fuentes del proyecto de diseño (`src/*.jsx` + `styles.css`), no el HTML
compilado. Cada vista del mockup tiene su equivalente:

| Mockup             | Aquí                                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| `styles.css`       | `src/app/dgrd.css`                                                       |
| `icons.jsx`        | `src/components/icons.tsx`                                               |
| `ui.jsx`           | `src/components/kit/`                                                    |
| `layout.jsx`       | `src/components/app/shell.tsx`                                           |
| `app.jsx` (AppCtx) | `src/components/app/provider.tsx`                                        |
| `login.jsx`        | `src/app/login/` + `components/auth/`                                    |
| `resumen.jsx`      | `src/components/views/resumen.tsx`                                       |
| `solicitudes.jsx`  | `src/components/views/solicitudes.tsx`                                   |
| `eventos.jsx`      | `src/components/views/eventos.tsx`                                       |
| `entregas.jsx`     | `src/components/views/entregas.tsx`                                      |
| `insumos.jsx`      | `src/components/views/insumos.tsx`                                       |
| `acciones.jsx`     | `src/components/views/acciones.tsx`                                      |
| `cronograma.jsx`   | `src/components/views/cronograma.tsx`                                    |
| `placeholders.jsx` | `views/usuarios.tsx`, `views/configuracion.tsx` (ya no son placeholders) |

## Decisiones de la rama

**Estilos portados tal cual.** `dgrd.css` es el `styles.css` del mockup, no una
reescritura en Tailwind. El objetivo es testear el diseño, no el sistema de
estilos; reescribirlo habría introducido deriva visual. Los tokens viven en
`.dgrd` (aplicado a `<body>`) y no en `:root` porque `--muted` y `--ring`
colisionan con los tokens semánticos de shadcn de `globals.css`.

**Rutas reales en vez del router interno.** El mockup guardaba la ruta en estado
(`{name, id}`). Acá cada vista tiene URL propia, con back/forward y deep links —
imprescindible para user testing. `app.nav({name, id})` se mantiene como API para
que las vistas queden idénticas al original; el mapeo vive en
`src/components/app/provider.tsx`.

**Todo el dominio se carga de una vez.** El layout de `(app)` llama a
`loadAppData()` y lo entrega al contexto de cliente. El volumen real es de
decenas de registros por entidad, y las vistas resuelven relaciones cruzadas en
memoria (entregas de un evento, actividades de una acción). Traer el conjunto
completo mantiene esos selectores intactos y evita una cascada de round-trips.
Las mutaciones son server actions que revalidan el layout.

**El schema habla inglés, la UI español.** La traducción ocurre una sola vez, en
`src/server/data.ts`, para que las vistas portadas no tuvieran que reescribirse.

**Evidencia en disco local.** `EVIDENCE_DIR`, fuera de `public/`, servida por
`/api/evidencia/[id]` con sesión validada. `Evidence.key` mantiene el contrato
para migrar a S3 cambiando solo `src/server/storage.ts`.

> ⚠️ **No funciona en serverless.** En Vercel el filesystem es de solo lectura
> salvo `/tmp`, que además es efímero y no se comparte entre instancias: las
> subidas fallan en tiempo de ejecución (el resto del sistema funciona bien).
> Para desplegar con evidencia operativa hay que reemplazar
> `src/server/storage.ts` por un blob store.

## Diferencias respecto al mockup

- **Sin Google OAuth.** Solo correo y contraseña, por pedido explícito.
- **Sin el toggle "Datos de ejemplo"** del menú de usuario. Contra una base real
  significaría insertar y borrar filas en cada clic. En su lugar, el seed carga
  los 4 eventos y 6 solicitudes de ejemplo del mockup como datos normales, para
  que el módulo de Emergencias no arranque vacío (las planillas municipales no
  traen esas dos entidades: son nuevas).
- **Usuarios y Configuración son reales**, no las pantallas de "próxima fase".
- **Una entrega por solicitud.** El schema define `Delivery.requestId` único; el
  mockup a veces vinculaba varias. El seed conserva el primer vínculo de cada
  solicitud y descarta los duplicados.
- **El PDF se previsualiza de verdad** en el lightbox (`<iframe>`), en vez del
  placeholder que mostraba el mockup.
- **El color por tipo de evento se deriva del nombre**, no de ids fijos
  (`te-1`…`te-7`), porque ahora los tipos se crean desde Configuración.

## Datos que carga el seed

Provienen de las planillas municipales incluidas en el proyecto de diseño
(Plan RRD 2026 y Entregas Ayudas 1ª respuesta 2026):

- 6 usuarios · 7 tipos de evento · 12 insumos
- 62 entregas con sus ítems
- 11 acciones estratégicas · 40 actividades
- 4 eventos y 6 solicitudes de ejemplo

`prisma/seed.ts` es idempotente: usa los ids del mockup como clave de upsert.
