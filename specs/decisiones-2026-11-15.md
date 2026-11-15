# Alcance y decisiones del 15 de noviembre de 2026

Aprobadas por Maximiliano en esta sesión; reemplazan los puntos incompatibles del backlog y del PRD anterior.

## Alcance

Completar eventos y tipos, solicitudes y flujo contextual, entregas, búsquedas, actividades, cronograma, usuarios, auditoría, móvil y navegación. Sin mapas, georreferenciación, indicadores/resumen, inventario con stock/bodegas, finanzas ni exportaciones. Los archivos (fotos de entregas y evidencia opcional de actividades) quedan fuera de esta implementación por confirmación del usuario al final de la sesión. No se inventarán juntas oficiales: seed pendiente del listado del usuario.

## Reglas

- Solicitudes: descripción opcional, estados pendiente/atendida/anulada. Atendida exige respuesta o entrega; entrega no cambia estado automáticamente. Folios anuales sin reutilización. Solicitud con entrega no se borra.
- Entregas: RUT del beneficiario obligatorio y junta opcional. Validar dígito verificador y normalizar RUT. Los históricos sin identidad conocida no se rellenan con datos inventados.
- Alerta al registrar entrega: consultar solo por RUT; mostrar fechas, insumos y cantidades de entregas en seis meses anteriores. Informativa, no bloquea, no se evalúa por junta. El RUT no se guarda en solicitudes.
- Actividades: fecha, dirección, objetivo y participantes obligatorios; sin estados. Advertir si la fecha queda fuera del periodo de su acción, permitir guardar. Evidencia opcional y diferida hasta la decisión de archivos.
- Cuentas con historial: no borrar, desactivar. Proteger la propia cuenta y preservar al menos un administrador activo.
- PRs abiertos por cambio funcional; no fusionar sin revisión del usuario. Los PRs dependientes deben señalar base y orden de integración.
