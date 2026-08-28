# DGRD Ñuñoa — Sistema de Gestión de Emergencias

Sistema interno de la Dirección de Gestión del Riesgo de Desastres de la Municipalidad de Ñuñoa.

Stack: **Next.js 16** (App Router, React 19) · **PostgreSQL (Neon) + Prisma 7** · **Better Auth** · **TanStack Query**.

> **Rama `spike/test-mockup`** — implementación completa del mockup de diseño para poder
> probarlo fuera del archivo standalone. Ver [SPIKE.md](./SPIKE.md) para las decisiones
> específicas de esta rama.

## Requisitos

- Node.js 20.19+ / 22.12+ / 24+
- [pnpm](https://pnpm.io/)
- Una base PostgreSQL. En esta rama se usa [Neon](https://neon.tech/); `docker-compose.yml`
  sigue disponible si prefieres levantar Postgres en local.

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
#    · DATABASE_URL → connection string *pooled* de Neon (host con -pooler)
#    · DIRECT_URL   → connection string *unpooled* (sin -pooler)
#    · BETTER_AUTH_SECRET → openssl rand -base64 32

# 3. Aplicar migraciones y generar el cliente de Prisma
pnpm db:migrate

# 4. Cargar los datos iniciales
pnpm db:seed

# 5. Iniciar el servidor de desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000) e ingresa con una de las cuentas
que crea el seed (por defecto `calvarado@nunoa.cl` / `dgrd2026`).

### Por qué dos connection strings

Neon expone un pooler (PgBouncer). La aplicación usa la conexión **pooled** (`DATABASE_URL`),
pero el motor de migraciones de Prisma necesita la conexión **directa** (`DIRECT_URL`): el
pooler no soporta las sentencias que emite. `prisma.config.ts` toma `DIRECT_URL` para la CLI
y `src/lib/prisma.ts` usa `DATABASE_URL` en runtime.

## Comandos

```bash
pnpm dev            # servidor de desarrollo
pnpm build          # build de producción
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
pnpm format         # Prettier (write)
pnpm db:migrate     # crear/aplicar migraciones (usa DIRECT_URL)
pnpm db:generate    # regenerar el cliente en src/generated/prisma
pnpm db:seed        # cargar datos iniciales
pnpm db:studio      # explorar los datos en el navegador
```

## Módulos

| Sección                     | Rutas                                                          |
| --------------------------- | -------------------------------------------------------------- |
| Resumen                     | `/resumen`                                                     |
| Emergencias                 | `/solicitudes`, `/eventos`                                     |
| Ayudas de primera respuesta | `/entregas`, `/insumos`                                        |
| Plan RRD                    | `/plan/cronograma`, `/plan/acciones`, `/plan/actividades/[id]` |
| Administración (solo admin) | `/admin/usuarios`, `/admin/configuracion`                      |

## Autenticación

- Servidor: `src/lib/auth.ts` · cliente: `src/lib/auth-client.ts`
- **Solo correo y contraseña.** El login con Google se retiró en esta rama.
- Roles `admin` / `regular` vía el plugin `admin` de Better Auth. Los administradores
  gestionan cuentas y catálogos; el resto comparte los mismos permisos operativos.
- `ALLOWED_EMAIL_DOMAIN` restringe el alta de cuentas a un dominio institucional.
  Vacío = sin restricción (así viene en esta rama, para poder probar con cualquier correo).

## Evidencia del Plan RRD

Las actividades admiten adjuntos (JPG, PNG, PDF · hasta 10 MB). El backend de almacenamiento
se elige solo en `src/server/storage.ts`:

- **Vercel Blob**, con el store en modo **privado**, si existe `BLOB_READ_WRITE_TOKEN`
  (Vercel lo inyecta al conectar el store al proyecto). Es el único que funciona en serverless.
- **Disco local** en cualquier otro caso, bajo `EVIDENCE_DIR`, fuera de `public/`.

En ambos casos los archivos se sirven por `/api/evidencia/[id]`, que valida la sesión antes de
responder. Con el store privado el objeto no es accesible por URL —leerlo exige el token—, así
que el archivo queda protegido incluso si su ruta se filtrara.

`Evidence.key` guarda el pathname dentro del store con prefijo `blob:` (no una URL), lo que
sobrevive a un cambio de store y distingue sin ambigüedad de una key de disco.

## Despliegue en Vercel

Variables de entorno del proyecto:

| Variable               | Valor                                              |
| ---------------------- | -------------------------------------------------- |
| `DATABASE_URL`         | Neon **pooled** (host con `-pooler`)               |
| `DIRECT_URL`           | Neon **unpooled**                                  |
| `BETTER_AUTH_SECRET`   | `openssl rand -base64 32`                          |
| `BETTER_AUTH_URL`      | El dominio real `https://…` — **no** `localhost`   |
| `ALLOWED_EMAIL_DOMAIN` | Vacío para no restringir; `nunoa.cl` en producción |

Además, conecta un **Blob store privado** al proyecto (Storage → Blob): eso inyecta
`BLOB_READ_WRITE_TOKEN` y habilita la subida de evidencia.

El build corre `prisma generate` antes de `next build`, porque el cliente se genera dentro de
`src/generated/prisma` y está gitignored. Las migraciones **no** se aplican en el build: corre
`pnpm db:migrate` contra la base antes de desplegar cambios de schema.

## Convenciones

- Usa `pnpm commit` (commitizen) en lugar de `git commit`. Husky valida formato con Prettier
  y mensajes con commitlint (conventional commits).
- Lógica compartida en `src/lib/`, acceso a datos y server actions en `src/server/`.

Más detalles para contribuir en [CLAUDE.md](./CLAUDE.md).
