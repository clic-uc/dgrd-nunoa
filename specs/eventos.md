# Eventos y tipos

## Tipos de evento

Administración exclusiva de administradores en `/administracion/tipos-evento` y `/api/event-types`. Nombre obligatorio de hasta 200 caracteres. Crear, listar con búsqueda y editar; borrado confirmado solo si no hay eventos asociados. La FK RESTRICT es la defensa ante asociaciones concurrentes. No se modifica el historial al renombrar un tipo.
