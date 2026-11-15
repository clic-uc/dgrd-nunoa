# Búsqueda y navegación

Decisión del 15 de noviembre de 2026: búsqueda general transversal, respetando permisos de lectura. `/buscar` y GET `/api/search` buscan en entregas, eventos, solicitudes, actividades, acciones, juntas e insumos. Mínimo 2 caracteres; hasta 20 resultados por módulo con orden estable y enlace a detalle. Los módulos no autorizados no se consultan; elegirlos explícitamente devuelve 403. No se buscan cuentas ni credenciales.

El periodo filtra fecha operativa en entregas/eventos/actividades, fecha de creación en solicitudes y solapamiento en acciones. Los catálogos de juntas e insumos no se filtran por fecha. Se pueden combinar módulo, texto y periodo. Incluye estados de búsqueda inicial, carga, vacío, error y reintento.

Entregas añade filtros independientes por nombre de beneficiario y evento específico, combinables con junta, insumo y periodo. Los selectores de evento para usuarios normales solo exponen id, folio y sector, sin habilitar el módulo de eventos.

La página inicial dirige a entregas. La navegación distingue acciones, actividades y cronograma; muestra administración solo a administradores y no ofrece resumen con indicadores. El menú móvil usa un diálogo accesible con cierre al navegar, foco contenido y devolución de foco. Las mismas reglas de visibilidad se aplican a ambas navegaciones.
