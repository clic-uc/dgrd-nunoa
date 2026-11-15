# Juntas vecinales

Catálogo normalizado `NeighborhoodAssociation` (`neighborhood_association`) con
CRUD, historial de entregas y asociación opcional desde `Delivery`.

## Modelo y decisiones

- `id`: CUID estable. Todas las relaciones y métricas usan este identificador.
- `number`: entero positivo único, con índice único y CHECK de PostgreSQL.
- `name`: nombre visible, obligatorio, máximo 200 caracteres. No es único: dos
  juntas pueden compartir nombre si tienen distinto número.
- `active`: disponibilidad para nuevas entregas, por defecto true.
- Timestamps y autoría (`createdBy`) con el patrón del resto del dominio.
- Dirección y otros atributos se pueden incorporar con futuras migraciones.

Se pueden corregir número y nombre sin perder asociaciones: el historial resuelve
la etiqueta actual desde el catálogo. El formulario avisa si existen entregas.

La eliminación física solo se permite si no hay entregas. La FK
`Delivery.neighborhoodAssociation` usa `onDelete: Restrict`. Para retirar una junta
con historial se desactiva; no se eliminan ni desvinculan sus entregas.

Una junta inactiva no puede usarse en altas ni en reasignaciones. Al editar una
entrega existente se permite conservar su propia junta inactiva, incluso si el
formulario vuelve a enviar el mismo id. Un PATCH sin esa propiedad también
conserva la asociación. El servidor verifica estas reglas con un bloqueo
`FOR SHARE`; edición, desactivación y borrado usan `FOR UPDATE`.

## Asociación con entregas

Se reemplaza `Delivery.jv String` por:

```prisma
neighborhoodAssociationId String?
neighborhoodAssociation NeighborhoodAssociation? @relation(
  fields: [neighborhoodAssociationId], references: [id], onDelete: Restrict
)
```

- La columna tiene un índice para filtros y relaciones.
- El formulario usa un selector con número y nombre. Las juntas inactivas solo
  aparecen si son la asociación original de la entrega editada.
- El listado permite filtrar por `neighborhoodAssociationId`, incluyendo juntas
  inactivas para consultar su historial.
- La búsqueda libre también consulta el nombre y, si se escribe un entero, el
  número de junta.
- El indicador de juntas distintas cuenta ids, no etiquetas.
- Los DTOs devuelven el id y `{ id, number, name, active }` de la junta.
- Mutaciones de entregas invalidan historiales/conteos de juntas. Mutaciones de
  juntas invalidan opciones y datos de entregas.

## Interfaz y contrato

- `/juntas-vecinales`: listado, búsqueda por número/nombre, filtro de estado,
  creación, edición y borrado.
- `/juntas-vecinales/[id]`: historial con filtros por periodo e insumo, orden por
  fecha, desglose por insumo/unidad y enlaces a las entregas. Ver B24–B25 abajo.
- Navegación en barra lateral y pestañas de Ayudas primera respuesta.
- Enlaces desde el listado y el detalle de entregas hacia la junta.

```text
GET    /api/neighborhood-associations?q&status=all|active|inactive
POST   /api/neighborhood-associations
GET    /api/neighborhood-associations/:id?order=asc|desc&from&to&supplyId
PATCH  /api/neighborhood-associations/:id
DELETE /api/neighborhood-associations/:id
```

Alta: `{ number, name, active }`. PATCH parcial. Sesión obligatoria: administradores y usuarios normales pueden consultar
el catálogo y su historial; solo administradores pueden crear, editar,
activar/desactivar o eliminar juntas. Ver [permisos por rol](./permisos.md). Errores mediante `AppError`, con 409 por número
repetido o borrado de una junta en uso. Fechas de salida ISO.

## Migración

`20261015000000_neighborhood_associations` crea tabla, índice único, restricciones
y FK de entregas, y sustituye `jv` por la referencia obligatoria.

Se verificó que la base de desarrollo configurada no tenía entregas antes de
aplicarla. No se inventan números ni se cargan nombres de juntas de ejemplo.

**Bases con entregas existentes:** la migración aborta explícitamente antes de
modificar datos. Se debe preparar un mapeo revisado entre cada valor antiguo
`jv` y el número/nombre oficial de la junta, y adaptar el backfill antes de
migrar esa base. No se permite deducir números o fusionar juntas automáticamente
por texto parecido. La migración completa es transaccional.

## Verificación

```bash
pnpm prisma migrate deploy
pnpm prisma generate
pnpm test:associations
RUN_ASSOCIATION_INTEGRATION=1 pnpm test:associations
RUN_DELIVERY_INTEGRATION=1 pnpm test:deliveries
RUN_SUPPLY_INTEGRATION=1 pnpm test:supplies
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Las integraciones cubren CRUD, números repetidos y altas concurrentes, historial,
filtros por identidad, juntas inactivas, preservación de asociaciones al corregir
etiquetas y FK de borrado. Se prueba la protección de datos legados ejecutando la
migración contra una tabla temporal en una conexión aislada, sin modificar tablas
públicas. Los fixtures de negocio se eliminan al terminar.

## Desglose por junta — B24 y B25

El detalle permite consultar qué insumos se distribuyeron en una junta y acceder
a las entregas que explican cada cantidad. No requiere migración de base de datos.
Administradores y usuarios normales pueden consultar; solo los primeros gestionan
el catálogo, según [permisos](./permisos.md).

### Filtros y reglas de cálculo

- `from` y `to`: fechas calendario `AAAA-MM-DD`, opcionales y combinables; ambos
  días se incluyen. La consulta usa medianoche UTC desde el inicio y un límite
  exclusivo al día siguiente de `to`. Se rechazan fechas imposibles y rangos
  invertidos con 400 y errores por campo.
- `supplyId`: CUID opcional. Filtra entregas que contienen ese insumo y devuelve
  exclusivamente sus ítems para calcular y presentar el resultado. No incluye
  las cantidades de otros insumos que viajaron en la misma entrega.
- `order`: `asc` o `desc` por fecha, con desempate por id. Por defecto `desc`.
- La consulta siempre se limita a la junta indicada; las inactivas conservan su
  historial. Un insumo válido sin entregas en la junta produce un resultado vacío.
- Los selectores incluyen los insumos usados en todo el historial de esa junta,
  independientemente del periodo actual. Así pueden ampliarse filtros vacíos.
- Se agrupa por id de insumo, mostrando nombre y unidad actuales del catálogo.
  No se fusionan insumos por nombre ni se suman unidades diferentes.
- Los beneficiarios se muestran en cada entrega; no se presentan conteos de
  personas únicas mientras su identidad siga sin definirse.

### Respuesta del detalle

Se conserva el DTO anterior y se agregan:

- `filteredDeliveryCount`: entregas que coinciden con los filtros.
- `availableSupplies`: `{ id, type, unit }[]` del historial completo de la junta.
- `supplyBreakdown`: `{ id, type, unit, quantity, deliveryCount }[]`, ordenado por
  nombre, unidad e id. Cada entrega cuenta una vez para cada insumo.
- `totalsByUnit`: `{ unit, quantity }[]` con totales independientes por unidad.
- Cada ítem de `deliveries` ahora incluye `quantity` y `supply: { id, type, unit }`.

`_count.deliveries` conserva el total histórico global, incluso al filtrar: es
necesario para advertencias y restricciones de borrado. El antiguo `totalUnits`
se mantiene por compatibilidad de API, referido al resultado filtrado, pero la
interfaz deja de mostrarlo porque puede mezclar magnitudes incompatibles.

### Interfaz y caché

Los filtros se aplican al enviar el formulario y pueden limpiarse juntos.
“Ver entregas” desde un insumo selecciona ese insumo conservando el periodo
aplicado y lleva al historial. Cada entrega muestra beneficiario, fecha e insumos
con sus cantidades y unidades, además de un enlace a su detalle.

La vista usa tarjetas y filas que se ajustan al ancho móvil, con filtros en una
columna en pantallas pequeñas. Hay estados de carga, actualización, error,
historial vacío y resultados vacíos por filtros. El historial global sigue
visible como indicador separado de los resultados.

Las claves de TanStack Query incluyen junta, periodo, insumo y orden. Durante
un cambio de filtro se conserva el resultado previo de la misma junta con un
indicador de actualización. No se reutilizan datos de otra junta. Las mutaciones
de entregas, juntas e insumos invalidan los desgloses afectados.

### Verificación del desglose

Las pruebas unitarias cubren fechas y rangos inválidos, agregados por identidad y
unidad, resultados vacíos, serialización de filtros HTTP y claves de caché.
Las pruebas de rutas verifican la transmisión de filtros y el rechazo 400 antes
de invocar servicios. El renderizado comprueba filtros, cantidades con unidad,
enlaces y permisos de gestión.

La integración PostgreSQL crea fixtures aislados y los elimina al terminar.
Cubre extremos inclusivos, un solo día, límites abiertos, orden, filtro por
insumo en entregas mixtas, aislamiento entre juntas, selectores independientes
del periodo, resultados vacíos y consulta de juntas inactivas.

```bash
pnpm test:associations
RUN_ASSOCIATION_INTEGRATION=1 pnpm test:associations
pnpm test:permissions
pnpm lint
pnpm exec tsc --noEmit
pnpm exec next build --webpack
```

## Decisión del 15 de noviembre de 2026 — junta opcional

La junta de una entrega es opcional. Ausencia se almacena como `null`; puede asignarse o quitarse al editar. Una entrega sin junta no aparece en desgloses de juntas ni cuenta como una junta distinta. El catálogo puede estar vacío sin impedir registrar entregas. La migración nueva conserva todas las referencias existentes y no sustituye el backfill pendiente de la migración histórica. El listado oficial para el seed sigue pendiente de entrega y validación.
