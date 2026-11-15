# Actividades y cronograma

Decisiones del 15 de noviembre de 2026: cada actividad pertenece a una acción estratégica. Fecha calendario UTC, dirección, objetivo y participantes obligatorios; sin estados. Se advierte en formulario y detalle cuando la fecha está fuera del periodo de la acción, pero no se bloquea. Usuarios normales y administradores gestionan actividades de cualquier autor.

CRUD en /api/activities; listado por texto, acción y periodo inclusivo. Alta desde el detalle de acción; consulta y edición en /actividades/[id], listado en /actividades. Mutaciones invalidan acciones y cronograma. La evidencia es opcional y su gestión queda pendiente de diseñar almacenamiento. Hasta entonces, se bloquea eliminar actividades con metadata de evidencia para no perder referencias a archivos.

/plan/cronograma muestra los periodos anuales de acciones y una agenda mensual con actividades del año seleccionado, incluidas las que quedan fuera del periodo de su acción. Tiene enlaces a ambos detalles, carga, error, reintento y vacío. En móvil la agenda se adapta y la línea anual permite desplazamiento horizontal.
