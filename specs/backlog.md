# Backlog del proyecto DGRD Ñuñoa

Actualizado: 30 de octubre de 2026.

Este documento consolida la revisión de `dev` frente a
el spike (archivado en el tag `archive/spike-test-mockup`) y los requerimientos posteriores de la contraparte.
El objetivo es completar los flujos del spike e incorporar las nuevas necesidades
operativas. Las prioridades y el orden de ejecución son propuestas, pendientes de
validación. Los identificadores B01–B34 conservan la numeración de la conversación.

## Estado vigente al 15 de noviembre de 2026

Esta sección y [las decisiones de la sesión](./decisiones-2026-11-15.md) reemplazan los estados y decisiones abiertas incompatibles de las secciones históricas siguientes. La implementación está en PRs pendientes de revisión, no fusionada en main.

- Implementado para revisión: tipos/eventos y flujo contextual, reglas/descripcion de solicitudes, folios persistentes, RUT obligatorio y alerta en entregas, junta opcional, búsquedas, actividades, cronograma, usuarios, navegación móvil y auditoría.
- Regla de recurrencia vigente: únicamente RUT del beneficiario en entregas, con aviso informativo al registrar entrega y fechas/insumos/cantidades de los seis meses calendario anteriores. Sin alerta por junta ni RUT en solicitudes.
- Actividades: sin estados; fecha, dirección, objetivo y participantes obligatorios; fechas fuera de periodo permitidas con advertencia.
- Fuera de esta implementación por decisión del usuario: B06/B26/B27 (archivos), B09 (indicadores/resumen), B18 (alerta por junta), B30–B33 (analítica/mapas), inventario, finanzas y exportaciones.
- Seed oficial de juntas y backfill legado: requieren listado/mapeo validado. No se inventan identidades ni asociaciones.
- Validación: suites automatizadas y pruebas de servidor con datos ficticios aislados. Revisión visual de móvil/escritorio pendiente por indisponibilidad del navegador automatizado.

## 1. Estado de partida

Según la revisión local de la rama `dev` en el commit `a572546`:

| Módulo                | Implementado                                                            | Pendiente principal                                                              |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Autenticación         | Acceso institucional con correo y contraseña, sesión y cierre de sesión | Pantallas de administración y nuevos permisos de dominio                         |
| Acciones estratégicas | CRUD, filtros y detalle con lectura de actividades                      | Gestión de actividades y evidencia                                               |
| Entregas              | CRUD, insumos, filtros, indicadores, detalle y asociación a solicitud   | Integración contextual con solicitudes/eventos, fotos, alertas y mejoras móviles |
| Insumos               | CRUD e historial de distribución                                        | Consulta específica por junta vecinal                                            |
| Juntas vecinales      | CRUD, activación/desactivación e historial de entregas                  | Desglose ampliado por insumo y beneficiario                                      |
| Solicitudes           | CRUD, folio, estados, filtros, evento opcional y entrega vinculada      | Creación con contexto desde eventos y alerta de recurrencia                      |
| Eventos               | Modelo de datos; pantalla placeholder                                   | Gestión completa                                                                 |
| Cronograma y resumen  | Base de datos disponible para construirlos                              | Vistas funcionales                                                               |
| Administración        | Base de autenticación con roles                                         | Gestión visual de cuentas y tipos de evento                                      |

La referencia a lo implementado no sustituye la validación funcional de cada
entrega. El trabajo de la rama `feat/solicitudes` (PR #8) se integró adaptado a
la arquitectura actual; ver [solicitudes](./solicitudes.md).

Documentación de los módulos existentes:

- [Entregas](./entregas.md).
- [Insumos](./insumos.md).
- [Juntas vecinales](./juntas-vecinales.md).
- [Solicitudes](./solicitudes.md).

## 2. Requerimientos confirmados y decisiones abiertas

Requerimientos expresados por la contraparte:

- Alertar cuando se entregue varias veces a la misma persona o junta vecinal.
- Usuario normal: acceder y modificar entregas, actividades y materiales.
- Administrador: acceso y gestión de todos los módulos, incluidas solicitudes, eventos, juntas vecinales y acciones estratégicas. Las restricciones por rol recaen en el usuario no administrador.
- El usuario normal puede modificar registros de todos los usuarios dentro de sus módulos permitidos; no se limita a registros propios.
- Incorporar posteriormente logs de auditoría para rastrear estas acciones.
- Buscar por campos específicos y mediante una búsqueda general: beneficiario,
  evento y junta vecinal.
- Consultar insumos distribuidos por junta vecinal y disponer de un desglose por junta.
- Tomar fotografías desde una entrega o adjuntarlas, especialmente desde móvil.
- Dar prioridad al uso móvil y al diseño responsivo.
- Incorporar visualización de datos y georreferenciación por entrega como NTH.

Se interpreta NTH como _nice to have_. Las decisiones siguientes están confirmadas;
los demás criterios de aceptación siguen siendo propuestas.

### Decisiones confirmadas sobre alertas y acceso

- **Regla de recurrencia:** más de una entrega en un lapso de seis meses.
- **Momento y lugar:** al crear una solicitud, revisar si el mismo responsable
  tiene entregas anteriores y mostrar la alerta en la solicitud.
- **Efecto:** la alerta solo informa; no bloquea, exige justificación ni requiere
  autorización de un administrador.
- **Identidad pendiente crítica:** falta definir cómo identificar al responsable
  y su relación con el beneficiario. Por petición de la contraparte, esta
  definición se abordará al final de las decisiones pendientes. No se asumirá
  que responsable significa el usuario que creó el registro ni se resolverá la
  identidad solo por similitud de nombres. B17 depende de cerrar esta definición.
- **Administrador:** puede gestionar todo el sistema, sujeto a las reglas de
  integridad del negocio; los límites por módulo corresponden al usuario normal.
- **Propiedad:** el usuario normal puede modificar registros de otros usuarios
  en los módulos autorizados. Las reglas de eliminación se cierran en B11.
- **Auditoría posterior:** registrar quién realizó las acciones sobre estos
  registros; se incorpora como requisito B34.

Queda precisar cómo se cuenta el umbral al crear la solicitud (si basta una
entrega previa para advertir una posible segunda, o si deben existir dos), la
fecha de referencia y los límites del periodo de seis meses. También queda
confirmar cómo se aplica la regla a juntas vecinales y si distingue insumos.

## 3. Prioridades y estados

- **Alta:** habilita flujos operativos centrales o protege su consistencia.
- **Media:** completa la experiencia y la paridad con el spike.
- **NTH:** mejora deseada posterior al flujo operativo principal.
- **Por validar:** idea sugerida, sin compromiso de implementación.

Los ítems siguientes están pendientes salvo B20–B21 y B24–B25, implementados
para los módulos existentes en esta rama; ver [permisos por rol](./permisos.md). Su
aplicación a módulos futuros sigue siendo parte del alcance de cada módulo.
Algunos ítems amplían funciones existentes. No se han asignado responsables, estimaciones ni fechas.

## 4. Acceso y administración

| ID  | Prioridad | Ítem                         | Alcance y criterio de aceptación propuesto                                                                                                                                           |
| --- | --------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B20 | Alta      | Permisos por rol en servidor | Implementado para los módulos actuales: política central y guards de lectura/escritura; 401 sin sesión y 403 sin permiso. Aplicar a futuros endpoints al implementarlos.             |
| B21 | Alta      | Interfaz según rol           | Implementado para los módulos actuales: navegación, controles y diálogos según permisos; páginas restringidas protegidas en servidor. Aplicar a futuras pantallas al implementarlas. |
| B08 | Media     | Administración de usuarios   | Listar, crear y editar cuentas; gestionar roles, activación y contraseñas. Proteger la propia cuenta y definir el tratamiento de usuarios con historial.                             |
| B01 | Alta      | Catálogo de tipos de evento  | Listar, crear, editar y eliminar tipos; bloquear el borrado de tipos en uso. Administración exclusiva del rol administrador.                                                         |

### Matriz de acceso (actualizada con la definición de B20–B21)

| Recurso                        | Usuario normal                                                                 | Administrador    |
| ------------------------------ | ------------------------------------------------------------------------------ | ---------------- |
| Entregas e insumos             | CRUD de registros de todos los autores; restricciones de integridad actuales   | Gestión completa |
| Juntas y acciones estratégicas | Listados, detalles e historiales; sin gestión                                  | Gestión completa |
| Solicitudes y eventos          | Sin acceso al módulo; selector y datos mínimos relacionados desde entregas     | Gestión completa |
| Resumen actual                 | Acceso al placeholder                                                          | Acceso completo  |
| Actividades y evidencia        | CRUD de cualquier autor definido en la política; pendiente implementar módulos | Gestión completa |
| Usuarios y tipos de evento     | Sin administración                                                             | Gestión completa |

Esta matriz reemplaza la suposición anterior de que todos los usuarios
autenticados comparten permisos sobre el dominio.

## 5. Emergencias y relaciones entre módulos

| ID  | Prioridad | Ítem                               | Alcance y criterio de aceptación propuesto                                                                                                                                                                    |
| --- | --------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B02 | Alta      | Gestión de eventos                 | CRUD, folio, búsqueda, filtros y detalle con solicitudes y entregas relacionadas. Depende de B01 y de la definición de permisos.                                                                              |
| B03 | Alta      | Gestión de solicitudes             | CRUD, folio, medio de ingreso, respuesta, estados y evento opcional. Implementado: ver [solicitudes](./solicitudes.md).                                                                                       |
| B04 | Alta      | Flujo evento → solicitud → entrega | Crear registros con contexto precargado, navegar entre relaciones y actualizar las vistas afectadas. Sincronizar el evento de la entrega al cambiar el evento de su solicitud dentro de la misma transacción. |
| B11 | Alta      | Reglas de eliminación              | Confirmar consecuencias y mostrarlas antes de eliminar. Actualmente borrar una solicitud elimina su entrega en cascada; no cambiar esta regla sin definición explícita.                                       |

B03 se integró a partir de la rama de solicitudes, reemplazando sus Server
Actions, rutas fuera de `(app)` y folios UUID por el patrón de módulos, permisos
por rol, folio correlativo e invalidación de datos relacionados. B04 queda
parcial: la sincronización del evento con la entrega ya está implementada.

## 6. Entregas, alertas, búsquedas y juntas vecinales

| ID  | Prioridad | Ítem                                           | Alcance y criterio de aceptación propuesto                                                                                                                                                                                                                                                |
| --- | --------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B19 | Alta      | Identificación de responsables / beneficiarios | Definición crítica pendiente, reservada para el final de las decisiones por petición de la contraparte. Definir identidad estable, relación responsable–beneficiario y tratamiento histórico; no asumir que es el autor del registro. Es dependencia de B17.                              |
| B17 | Alta      | Alerta de recurrencia en solicitudes           | Al crear una solicitud, revisar entregas anteriores del mismo responsable en un lapso de seis meses. Regla confirmada: más de una entrega. Mostrar aviso informativo en la solicitud, sin bloqueo ni autorización. Cerrar la identificación y el cómputo del umbral antes de implementar. |
| B18 | Alta      | Alertas por junta                              | Aplicar la regla de más de una entrega en seis meses, precisando su evaluación por junta y su relación con el responsable de la solicitud. El canal confirmado es la solicitud y el efecto es informativo; no agregar un aviso distinto en entregas sin definirlo.                        |
| B22 | Alta      | Búsqueda por campos                            | Filtros independientes por beneficiario, evento y junta, combinables con fecha e insumo. Mostrar los filtros activos y permitir limpiarlos.                                                                                                                                               |
| B23 | Media     | Búsqueda general                               | Entrada única para localizar beneficiarios, eventos y juntas. Definir si abarca un listado o todo el sistema; respetar permisos en los resultados.                                                                                                                                        |
| B24 | Alta      | Insumos distribuidos por junta                 | Implementado: filtro por periodo e insumo, cantidades por unidad y entregas que componen el resultado. Ver [juntas vecinales](./juntas-vecinales.md#desglose-por-junta--b24-y-b25).                                                                                                       |
| B25 | Alta      | Desglose por junta                             | Implementado: totales por insumo/unidad, beneficiario y fecha en cada entrega, enlaces al detalle y presentación adaptable a móvil. No se cuentan personas únicas.                                                                                                                        |

El canal confirmado es un aviso informativo en la solicitud al crearla. Correos,
un centro de notificaciones y avisos adicionales posteriores no están confirmados.

## 7. Fotografías y uso móvil

| ID  | Prioridad | Ítem                                 | Alcance y criterio de aceptación propuesto                                                                                                                                |
| --- | --------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B26 | Alta      | Capturar y adjuntar fotos a entregas | Permitir tomar una fotografía desde un dispositivo compatible o elegir un archivo; previsualizar y quitar la selección antes de guardar.                                  |
| B27 | Alta      | Gestión de fotos de entregas         | Persistir archivos vinculados a la entrega, controlar acceso y validar formato/tamaño. Definir límites, conservación y limpieza de archivos ante errores o eliminaciones. |
| B28 | Alta      | Flujo de entregas en móvil           | Completar alta, búsqueda, consulta y edición desde pantalla pequeña; controles táctiles, formularios legibles y errores claros. Incluir captura y carga de fotos.         |
| B29 | Alta      | Resto de módulos en móvil            | Navegación según rol y listados/formularios utilizables en actividades, materiales y demás módulos autorizados.                                                           |
| B16 | Media     | Validación transversal de interfaz   | Revisar teclado, foco, etiquetas, estados de carga/error y diferentes tamaños de pantalla. Complementa los requisitos móviles B28–B29.                                    |

El diseño responsivo debe formar parte de la aceptación de cada feature. La
evidencia de actividades y las fotografías de entregas son relaciones distintas,
aunque pueden compartir infraestructura de almacenamiento.

## 8. Plan RRD y vistas generales

| ID  | Prioridad | Ítem                        | Alcance y criterio de aceptación propuesto                                                                                                                          |
| --- | --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B05 | Alta      | Gestión de actividades      | Crear, editar, eliminar y consultar actividades de una acción: fecha, objetivo, dirección y participantes. Definir si pueden quedar fuera del periodo de su acción. |
| B06 | Alta      | Evidencia de actividades    | Adjuntar, consultar, descargar, previsualizar y eliminar archivos con validación y acceso autorizado; mantener consistencia entre archivos y base de datos.         |
| B07 | Media     | Cronograma                  | Línea de tiempo anual con periodos de acciones, actividades y agenda por mes; acceso a los detalles. Depende de B05.                                                |
| B09 | Media     | Resumen                     | Indicadores y tarjetas de entregas, solicitudes, eventos, insumos y actividades. Definir periodo y adaptar contenido al rol.                                        |
| B10 | Media     | Navegación y página inicial | Separar Acciones y Cronograma, incorporar administración según permisos y sustituir la página inicial “Hola mundo” por un destino útil.                             |

## 9. Visualización y georreferenciación — NTH

| ID  | Prioridad | Ítem                               | Alcance y criterio de aceptación propuesto                                                                                                                           |
| --- | --------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B30 | NTH       | Visualizar distribución de ayudas  | Gráficos por periodo, junta e insumo, con filtros y acceso al detalle de las cifras. Separar cantidades por unidad.                                                  |
| B31 | NTH       | Visualizar cobertura y recurrencia | Beneficiarios únicos, juntas atendidas y frecuencia de entregas. Depende de una identificación fiable de beneficiarios y reglas de cálculo acordadas.                |
| B32 | NTH       | Georreferenciar entregas           | Registrar coordenadas por GPS o selección manual, corregir ubicación y permitir continuar cuando no se autorice la geolocalización. Definir precisión y visibilidad. |
| B33 | NTH       | Mapa de entregas                   | Consultar entregas georreferenciadas con filtros por periodo, junta e insumo; aplicar permisos y criterios de privacidad. Depende de B32.                            |

## 10. Datos, calidad y despliegue

| ID  | Prioridad                 | Ítem                              | Alcance y criterio de aceptación propuesto                                                                                                                                                                          |
| --- | ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B12 | Alta si hay datos legados | Migración de juntas vecinales     | Preparar un mapeo revisado de textos antiguos a juntas oficiales y verificar el backfill. La migración actual se detiene si encuentra entregas legadas. No inventar correspondencias ni eliminar datos para migrar. |
| B13 | Alta                      | Validación de flujos integrados   | Verificar relaciones, cambios de evento, restricciones, concurrencia, permisos e invalidación de caché; recorrer los flujos principales desde la interfaz, incluyendo móvil.                                        |
| B14 | Alta antes del despliegue | Verificación técnica reproducible | Resolver o confirmar resuelto el conflicto de archivos generados duplicados en `.next/types`; ejecutar TypeScript, lint, integraciones y build.                                                                     |
| B15 | Media                     | Documentación                     | Crear specs de módulos nuevos, actualizar `notas/guia.md` y documentar permisos, archivos, migraciones y despliegue.                                                                                                |

En la revisión del 16 de octubre: lint y 15 pruebas unitarias aprobaron; cuatro
pruebas de integración se omitieron por requerir activación explícita. TypeScript
falló por archivos duplicados en `.next/types` y no se ejecutó build. Es evidencia
histórica, no una certificación del estado actual.

### B34 — Logs de auditoría (requisito confirmado, implementación posterior)

Prioridad propuesta: Media, como etapa posterior de trazabilidad.

Registrar las acciones sobre registros, especialmente las realizadas sobre datos
creados por otros usuarios. Alcance propuesto: altas, modificaciones y eliminaciones,
con usuario ejecutor, fecha/hora, entidad e identificador y cambios realizados.
Definir acceso a consulta de logs, conservación y detalle de datos registrados.
La auditoría no restringe la modificación de registros ajenos ya autorizada.

## 11. Orden de ejecución propuesto

| Etapa                                  | Trabajo                                                      | Dependencias y propósito                                                                               |
| -------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1. Definiciones y acceso               | Cerrar pendientes de Q01 y Q04–Q06; B20–B21; iniciar B28–B29 | Cerrar reglas que afectan datos, permisos y flujo móvil.                                               |
| 2. Emergencias                         | B01–B04 y B11                                                | Completar evento → solicitud → entrega con permisos coherentes.                                        |
| 3. Consulta y prevención de repetición | B22–B25; B19 y B17–B18 tras cerrar identidad                 | Mejorar consulta por junta y advertir recurrencia con identidad y umbrales definidos.                  |
| 4. Fotos de entregas                   | B26–B28                                                      | Requiere definir almacenamiento, límites y tratamiento de archivos.                                    |
| 5. Plan RRD                            | B05–B07                                                      | Actividades, evidencia y cronograma. Puede adelantarse según prioridad operativa.                      |
| 6. Administración y consolidación      | B08–B10 y posteriormente B34                                 | Completar cuentas, navegación y resumen. Adelantar B08 si se necesita para operar con usuarios reales. |
| 7. Analítica y territorio              | B30–B33                                                      | Implementar NTH sobre datos consistentes y accesos definidos.                                          |

B12–B16 se trabajan durante las etapas correspondientes. B12 y B14 deben estar
resueltos antes del despliegue cuando apliquen. No representan una etapa final
que permita posponer la consistencia de datos o el uso móvil.

## 12. Preguntas de seguimiento

Las respuestas deben registrarse aquí antes de convertir los ítems afectados en
especificaciones cerradas.

| ID  | Tema                                   | Pregunta                                                                                                                                                                                                                                                                                               | Afecta            |
| --- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| Q01 | Alertas: parcialmente resuelto         | Confirmado: más de una entrega en seis meses. Precisar cuántas entregas previas disparan el aviso al crear la solicitud, fecha de referencia, extremos del periodo y aplicación por junta/insumo.                                                                                                      | B17–B18           |
| Q02 | Efecto y canal: resuelto               | Solo informa y aparece en la solicitud al crearla, tras revisar las entregas anteriores del mismo responsable. No bloquea ni exige autorización.                                                                                                                                                       | B17–B18           |
| Q04 | Roles: resuelto para módulos actuales  | Administrador gestiona todo. Usuario normal gestiona entregas e insumos de todos, consulta juntas y acciones, y conserva selector/datos mínimos de solicitudes desde entregas. Resumen actual permitido; actividades/evidencia quedan preparadas en la política.                                       | B20–B21           |
| Q05 | Propiedad: resuelto; lectura pendiente | Confirmado: el usuario normal modifica registros de todos dentro de sus módulos. Lectura mínima y selector desde entregas autorizados; eliminación de entregas, actividades e insumos autorizada con restricciones actuales. Q06 sigue abierto para solicitudes. Incorporar logs posteriormente (B34). | B20–B21, B11, B34 |
| Q06 | Eliminación                            | ¿Se mantiene la cascada al borrar una solicitud o se bloquea el borrado/conserva historial?                                                                                                                                                                                                            | B03–B04, B11      |
| Q07 | Estados                                | ¿Qué permite marcar una solicitud como atendida o cancelada? ¿Se exige respuesta o entrega?                                                                                                                                                                                                            | B03               |
| Q08 | Folios                                 | ¿Eventos y solicitudes usarán correlativo anual? ¿Se permite reutilizar el último número si se elimina?                                                                                                                                                                                                | B02–B03           |
| Q09 | Fotografías                            | ¿Son opcionales, cuántas se permiten y qué deben documentar? ¿Se permite reemplazarlas o eliminarlas después?                                                                                                                                                                                          | B26–B27           |
| Q10 | Almacenamiento                         | ¿Dónde se guardarán fotos y evidencia en producción? ¿Qué tipos, tamaños y plazos de conservación se necesitan?                                                                                                                                                                                        | B06, B27          |
| Q11 | Búsqueda                               | ¿La búsqueda general abarca todo el sistema o el listado actual? ¿Qué campos deben buscar coincidencias exactas o parciales?                                                                                                                                                                           | B22–B23           |
| Q12 | Datos iniciales                        | ¿Qué planillas se importarán y quién valida las juntas oficiales y la correspondencia histórica?                                                                                                                                                                                                       | B12, B19          |
| Q13 | Actividades                            | ¿Se permiten fechas fuera del periodo de la acción estratégica?                                                                                                                                                                                                                                        | B05–B07           |
| Q14 | Indicadores                            | ¿El resumen es global o filtrable por periodo? ¿Qué gráficos y decisiones operativas son prioritarios?                                                                                                                                                                                                 | B09, B30–B31      |
| Q15 | Ubicación                              | ¿Se ubica el lugar de entrega o el domicilio del beneficiario? ¿Qué precisión y acceso se requieren?                                                                                                                                                                                                   | B32–B33           |
| Q16 | Priorización                           | ¿Se confirma el orden propuesto? ¿Visualización y georreferenciación siguen siendo NTH?                                                                                                                                                                                                                | Plan de ejecución |

### Q03 — Identificación del responsable (crítica, revisar al final)

¿Qué dato identifica al responsable y cómo se relaciona con el beneficiario de
una entrega? ¿Se necesita un catálogo y cómo se resolverán los registros históricos?

Se deja deliberadamente para el final de las decisiones pendientes. Esta
postergación no elimina la dependencia: no se puede cerrar B17 ni calcular
personas únicas en B31 hasta resolverla. Afecta B19, B17 y B31.

## 13. Ideas adicionales por validar

Estas ideas surgieron como sugerencias y no son requisitos confirmados:

- Exportación de reportes de entregas, solicitudes, eventos y Plan RRD.
- Importación desde planillas con revisión previa y reporte de errores.
- Recordatorios de solicitudes pendientes y próximas actividades, distintos de las alertas de repetición.
- Inventario con existencias, ingresos y movimientos, únicamente si se requiere
  control de stock. El catálogo actual de insumos registra distribución sin stock.

## 14. Criterio común de cierre

Cada ítem se considera cerrado cuando su alcance y reglas están definidos, sus
operaciones respetan los permisos en servidor, la interfaz funciona en los
dispositivos objetivo y los estados de carga, vacío y error están resueltos.
Las relaciones e historiales deben conservar consistencia, las verificaciones
pertinentes deben aprobar y la documentación debe reflejar la implementación.
