# Solicitudes

Gestión de solicitudes de emergencia (B03). Parte del trabajo original de la
rama `feat/solicitudes` (PR #8) y lo adapta a la arquitectura de `dev`:
`schemas → service → rutas REST → api/queries → components`, con el estilo visual
de entregas.

## Qué se conservó de la rama original

- Campos del formulario: medio/fuente obligatorio, respuesta opcional y evento
  opcional, más el estado (pendiente, atendida, anulada).
- Filtro del listado por asociación a evento (todas, con evento, sin evento).
- Al cambiar el evento de una solicitud, la entrega vinculada lo hereda en la
  misma transacción (B04).
- Confirmación antes de eliminar, mostrando que la entrega vinculada se borra en
  cascada (B11), y rechazo del borrado si la entrega cambió desde que se mostró.

## Qué cambió respecto de la rama original

- **Rutas dentro de `(app)`.** `/solicitudes` y `/solicitudes/[id]` heredan el
  guard de sesión y el shell. La rama original agregaba `src/app/solicitudes/`
  junto al placeholder de `(app)`, y Next no compilaba con dos páginas para la
  misma ruta.
- **Permisos por rol.** Las rutas usan `requirePermission("requests", …)` y las
  páginas muestran `AccessDenied` al usuario normal. Solo administradores
  gestionan solicitudes (ver [permisos](./permisos.md)). La rama original
  permitía crear, editar y eliminar a cualquier usuario autenticado.
- **REST + TanStack Query** en lugar de Server Actions, igual que el resto de
  los módulos. Crear y editar se hacen en diálogos, sin páginas `nueva` ni `editar`.
- **Folio correlativo anual `SOL-AAAA-NNN`** en lugar de `SOL-<uuid>`. Las altas
  del año se serializan con `pg_advisory_xact_lock(684104, año)`, igual que las
  entregas con `ENT-AAAA-NNN`.
- **Invalidación cruzada.** Las mutaciones de solicitudes invalidan entregas
  (selector y evento heredado), insumos y juntas (historiales afectados por el
  borrado en cascada). Las mutaciones de entregas invalidan solicitudes.

## API

| Método | Ruta                    | Descripción                                                                 |
| ------ | ----------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/requests`         | Listado. Filtros `q` (folio, medio, respuesta), `event`, `status`.          |
| POST   | `/api/requests`         | Alta. Asigna folio, fecha y autor.                                          |
| GET    | `/api/requests/[id]`    | Detalle con autor, evento y entrega vinculada.                              |
| PATCH  | `/api/requests/[id]`    | Edición parcial. `eventId: null` desvincula el evento (y el de la entrega). |
| DELETE | `/api/requests/[id]`    | Borrado. `?expectedDeliveryId=<id>` o vacío; si no coincide, 409.           |
| GET    | `/api/requests/options` | Eventos disponibles para el selector.                                       |

## Concurrencia

- Edición y borrado bloquean la fila de la solicitud con `FOR UPDATE`, el mismo
  bloqueo que toma una entrega al vincularse. Así la sincronización del evento y
  la verificación de la entrega esperada no compiten con un alta de entrega.
- El evento elegido se valida con `FOR SHARE` para que no se elimine entre la
  validación y el commit.

## Pendiente

- Gestión de eventos (B02) y creación con contexto precargado desde un evento (B04).
- Alerta de recurrencia al crear una solicitud (B17), sujeta a la definición de
  responsable (B19).

## Pruebas

```bash
pnpm test:requests                              # schemas y folio
RUN_REQUEST_INTEGRATION=1 pnpm test:requests    # + integración contra PostgreSQL
pnpm test:permissions                           # rutas y páginas por rol
```

## Decisiones aprobadas el 15 de noviembre de 2026

- Descripción opcional (máximo 2000 caracteres), distinta de la respuesta.
- Estados: pendiente, atendida y anulada. Atendida exige respuesta no vacía o entrega vinculada; crear una entrega no cambia automáticamente el estado. Quitar o eliminar la única entrega de una solicitud atendida sin respuesta se rechaza hasta registrar una respuesta o cambiar el estado.
- Se bloquea el borrado de solicitudes con entrega, también mediante FK RESTRICT. Se ofrece anularla. Esto reemplaza el borrado en cascada anterior.
- Folios anuales por año de creación en Chile. Contadores persistentes y atómicos, inicializados con los máximos existentes; borrar registros no libera números. La reserva ocurre dentro de la transacción de negocio.
- RUT solo en entregas; la alerta se mostrará al registrar la entrega, no en solicitudes.
