# Entregas (tabla `delivery`)

Rama: `feat/entregas`. Implementación del módulo de entregas de
el spike (tag `archive/spike-test-mockup`), adaptado al patrón de features de esta rama:
`schemas` → `service` → rutas REST → `api`/`queries` → `components`.

## Alcance y decisiones

Decisiones confirmadas el 2026-10-14:

- Reproducir la distribución y el estilo visual del spike con los tokens existentes.
- Abrir el detalle en un drawer desde la tabla y ofrecer una página `/entregas/[id]`.
- Usar solicitudes e insumos existentes en la base mediante selectores. El catálogo
  de insumos también se implementó en esta rama (ver `insumos.md`). Los CRUD de
  solicitudes y eventos siguen fuera de alcance; sus tarjetas muestran los datos
  sin enlaces a páginas de detalle todavía inexistentes.
- Conservar el folio anual `ENT-AAAA-NNN` (ej. `ENT-2026-001`), generado por el
  servidor. El año corresponde a la fecha de registro en `America/Santiago`, no
  a la fecha de entrega introducida. El correlativo usa el mayor sufijo numérico
  del año, no el número de filas ni el orden lexicográfico. Las altas del mismo
  año se serializan con un bloqueo transaccional de PostgreSQL. Como no existe
  una tabla de secuencias persistente, borrar el último folio permite reutilizar
  ese correlativo en el siguiente alta.
- Contacto opcional: vacío se normaliza a `null`.
- Junta vecinal opcional desde el catálogo, con filtro por identificador.
  Las nuevas entregas solo admiten juntas activas; el historial conserva las inactivas.
- Requerir al menos un insumo, cantidades enteras positivas y no repetir insumos.
- Asociación opcional a una solicitud; máximo una entrega por solicitud.
  `eventId` se hereda de la solicitud y no se edita directamente.

La versión anterior de esta spec difería insumos, relaciones y filtros avanzados.
El alcance se amplió para incorporar esas funciones del spike.

## Funcionalidad implementada

- Listado con búsqueda por folio, beneficiario, junta vecinal, dirección y folio del evento.
- Rango de fechas inclusivo y periodos rápidos: este mes, 30 días y este año.
- Filtros con/sin evento, insumo incluido y orden por fecha.
- Indicadores calculados sobre los resultados filtrados: entregas, unidades y juntas vecinales.
- Formulario de alta y edición: fecha, junta vecinal del catálogo, beneficiario, contacto,
  dirección y solicitud opcional. Folio generado fuera del formulario.
- Filas dinámicas de insumos: tipo, unidad y cantidad. Si un tipo tiene una sola
  unidad, se selecciona automáticamente; las variantes ocupadas se deshabilitan.
- Detalle en drawer y página, con insumos, relaciones, autor y fecha de registro.
- Edición desde la tabla o detalle; borrado con confirmación.
- Estados de carga, error con reintento, catálogo vacío y listado vacío/con filtros.

## Contrato

```text
GET    /api/deliveries        ?q&from&to&event=all|with|without&supplyId&order=asc|desc
POST   /api/deliveries
GET    /api/deliveries/options
GET    /api/deliveries/:id
PATCH  /api/deliveries/:id
DELETE /api/deliveries/:id
```

Entrada: `beneficiary`, `neighborhoodAssociationId`, `contact`, `address`, `date` (`AAAA-MM-DD`),
`requestId` nullable y `items: [{ supplyId, quantity }]`.
Los PATCH son parciales. Si incluyen `items`, reemplazan el conjunto completo
atómicamente. Si incluyen `requestId`, actualizan también el evento heredado.
Las fechas de salida son strings ISO; se guardan como medianoche UTC y se muestran
con `formatDate()`. Los identificadores del dominio son CUID.

El servicio valida que existan los insumos y que la solicitud exista y esté libre.
Los índices únicos y claves foráneas mantienen las restricciones ante carreras.
Los errores se traducen mediante `AppError`, con `fieldErrors` cuando corresponde.
El borrado de una entrega elimina sus ítems, sin eliminar solicitud, evento o catálogo.

## Base de datos

- `contact String?` y migración `delivery_contact_optional`.
- Prisma CLI usa `DIRECT_URL`, con fallback a `DATABASE_URL`.
- El catálogo de juntas y la sustitución de `jv` por una FK obligatoria están en
  `20261015000000_neighborhood_associations`; ver `juntas-vecinales.md`.
- `Delivery.request` conserva `onDelete: Cascade`; borrar una solicitud borra su entrega.
- `Delivery.event` conserva `onDelete: SetNull`.

## Validación

```bash
pnpm test:deliveries
# Incluye la integración contra la DB de desarrollo configurada en .env.
# Crea fixtures aislados y los elimina al terminar.
RUN_DELIVERY_INTEGRATION=1 pnpm test:deliveries
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las pruebas cubren normalización, fechas imposibles, cantidades, duplicados,
PATCH parcial, filtros, conversión de formulario, folios, CRUD real,
herencia del evento, sustitución de ítems y altas concurrentes.

## Integraciones para otras ramas

- CRUD de solicitudes y eventos. El CRUD de insumos ya está implementado.
- Crear entregas desde las páginas de solicitud y evento, con contexto precargado.
- Mostrar entregas en los detalles de solicitudes y eventos y en el resumen.
  El historial por insumo ya está implementado.
- Al cambiar el evento de una solicitud, sincronizar `Delivery.eventId` en la misma
  transacción, como hace el spike. Es responsabilidad del futuro módulo de solicitudes.

## Decisión del 15 de noviembre de 2026

La junta vecinal es opcional: se admite omitirla o enviar `null`; en PATCH omitir conserva la referencia y `null` la retira. Esta decisión reemplaza la obligatoriedad anterior. Listado y detalle muestran «Sin junta vecinal».
