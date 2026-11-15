# Candidato integrado — 15 de noviembre de 2026

Rama `chore/verificacion-integrada`. Contiene las ramas funcionales y la resolución de su integración. Ningún PR se fusionó en main y no se realizó un despliegue.

## PRs funcionales y dependencias

| PR                                                   | Cambio                            | Base |
| ---------------------------------------------------- | --------------------------------- | ---- |
| [#16](https://github.com/clic-uc/dgrd-nunoa/pull/16) | Junta opcional                    | main |
| [#17](https://github.com/clic-uc/dgrd-nunoa/pull/17) | Solicitudes y folios persistentes | main |
| [#18](https://github.com/clic-uc/dgrd-nunoa/pull/18) | Tipos de evento                   | #17  |
| [#19](https://github.com/clic-uc/dgrd-nunoa/pull/19) | Eventos y flujo contextual        | #18  |
| [#20](https://github.com/clic-uc/dgrd-nunoa/pull/20) | RUT y alerta en entregas          | #16  |
| [#21](https://github.com/clic-uc/dgrd-nunoa/pull/21) | Actividades y cronograma          | #19  |
| [#22](https://github.com/clic-uc/dgrd-nunoa/pull/22) | Usuarios                          | #21  |
| [#23](https://github.com/clic-uc/dgrd-nunoa/pull/23) | Búsqueda y navegación móvil       | #22  |
| [#24](https://github.com/clic-uc/dgrd-nunoa/pull/24) | Auditoría                         | #23  |

El candidato integrado combina ambas cadenas e incluye correcciones encontradas al verificarlas juntas. Revisar cada cambio en su PR y utilizar el candidato completo para la validación previa al despliegue; no desplegar snapshots intermedios. Las dependencias de los PRs apilados deben respetarse o retargetearse después de integrar sus bases.

## Verificación ejecutada

- Node 24.18.0 para compilación y ejecución; `.nvmrc` y `engines` fijan Node 24.
- PostgreSQL 17 temporal e independiente de la base configurada en `.env`.
- Diez migraciones aplicadas desde cero. Ensayo adicional de todas las migraciones en un esquema aislado con entregas históricas sin RUT, folios correlativos existentes y folio legado no numérico.
- **62 pruebas aprobadas, cero fallos y cero omitidas** con `scripts/test-integration.mjs`. Incluye permisos, rutas reales, modelos de formulario, fechas, RUT, filtros, concurrencia, relaciones, cuentas, auditoría y rollback.
- TypeScript, lint y Prettier aprobados.
- Build de producción con Next 16.2.7/Turbopack aprobado.
- Prueba HTTP sobre el servidor compilado con cuentas y datos ficticios: login de ambos roles, revocación al cerrar sesión, páginas de servidor, creación con RUT y junta opcional, recurrencia, trazabilidad del ejecutor en auditoría, búsqueda filtrada por permisos, protección de solicitud con entrega y bloqueo de endpoints administrativos alternativos.

## Correcciones de integración

- Combinar RUT/junta opcional con reglas de atención, bloqueos, contadores y filtros.
- Conservar operativos los cambios heredados de evento en entregas históricas sin RUT. Las nuevas entregas requieren RUT y uno registrado no se puede retirar; el formulario y API exigen completarlo al editar históricos.
- Resolver errores de restricciones del adaptador PostgreSQL como conflictos de dominio, sin exponer SQL.
- Consultar RUT con o sin puntos; actualizar caches de relaciones al renombrar tipos, cambiar periodos de acciones o editar usuarios.
- Revertir la transacción auditada cuando un endpoint de autenticación devuelve una respuesta fallida.

## Límites y pendientes explícitos

- **No se verificó visualmente escritorio/móvil**: el navegador integrado no estuvo disponible y el acceso nativo a Brave agotó el tiempo de espera. Las comprobaciones de renderizado de servidor y permisos no sustituyen esa revisión.
- Fotos y evidencia quedan fuera de esta implementación por decisión del usuario. No hay almacenamiento ni endpoints de archivos.
- Sin mapas/georreferenciación, nuevos indicadores/resumen, inventario/stock, finanzas ni exportaciones.
- Seed oficial de juntas pendiente del listado validado del usuario. Una base que conserve `jv` de texto libre necesita mapeo/backfill revisado antes de su migración histórica; la protección original no se retiró.
- No se inventaron RUT ni asociaciones históricas. La auditoría comienza al aplicar la migración y no reconstruye acciones previas.
- Antes de desplegar, revisar estos PRs, comprobar visualmente los flujos, respaldar y ensayar las migraciones sobre una copia representativa de los datos reales.

## Cómo repetir

```bash
nvm use
pnpm exec prisma generate
pnpm typecheck
pnpm lint
pnpm format:check
TEST_DATABASE_URL='postgresql://usuario:clave@localhost:5432/dgrd_test' pnpm test:integration
pnpm build
```

El verificador de integración fija DATABASE_URL y DIRECT_URL a TEST_DATABASE_URL. `pnpm test` sin ese verificador omite las integraciones de forma intencionada. No ejecutar las pruebas con las URLs operativas.
