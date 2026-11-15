# Eventos y tipos

## Tipos de evento

Administración exclusiva de administradores en `/administracion/tipos-evento` y `/api/event-types`. Nombre obligatorio de hasta 200 caracteres. Crear, listar con búsqueda y editar; borrado confirmado solo si no hay eventos asociados. La FK RESTRICT es la defensa ante asociaciones concurrentes. No se modifica el historial al renombrar un tipo.

## Gestión de eventos

Administradores: CRUD en `/eventos` y `/api/events`. Fecha calendario UTC, tipo, sector/dirección, instituciones y acciones obligatorios; afectados opcional entero no negativo. Folio EVT anual sin reutilización. Filtros por texto, tipo y periodo inclusivo; detalle con solicitudes y entregas enlazadas. La creación de solicitud desde evento precarga su referencia; la creación de entrega desde solicitud precarga la solicitud y hereda su evento. Mutaciones invalidan relaciones cruzadas.

Para conservar trazabilidad, no se permite borrar un evento con solicitudes o entregas relacionadas. Se bloquea su fila antes de comprobar referencias. Los escritores de solicitudes toman FOR SHARE, evitando asociaciones entre la comprobación y el borrado. El renombrado de tipos actualiza la consulta de eventos.
