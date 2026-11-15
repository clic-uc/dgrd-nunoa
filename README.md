# DGRD Ñuñoa — Sistema de Gestión de Emergencias

Sistema interno de la Dirección de Gestión del Riesgo de Desastres de la Municipalidad de Ñuñoa.

Stack: **Next.js 16** (App Router, React 19) · **PostgreSQL + Prisma 7** · **Better Auth** · **TanStack Query** · **Tailwind v4 + shadcn**.

## Requisitos

- Node.js 20.19+ / 22.12+ / 24+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/) (para la base de datos local)

## Puesta en marcha

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env: genera el secret con `openssl rand -base64 32`
# y define ADMIN_EMAIL / ADMIN_PASSWORD para la cuenta inicial.

# 3. Levantar la base de datos (PostgreSQL en Docker)
docker compose up -d

# 4. Aplicar las migraciones y generar el cliente de Prisma
pnpm prisma migrate dev
pnpm prisma generate

# 5. Crear la cuenta de administrador inicial
pnpm db:seed

# 6. Iniciar el servidor de desarrollo
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Base de datos (Docker)

El archivo `docker-compose.yml` levanta un PostgreSQL 17 local:

| Parámetro | Valor           |
| --------- | --------------- |
| Host      | `localhost`     |
| Puerto    | `5432`          |
| Usuario   | `dgrd`          |
| Password  | `dgrd`          |
| Base      | `dgrd_nunoa`    |
| Container | `dgrd-nunoa-db` |

Comandos útiles:

```bash
docker compose up -d      # iniciar en segundo plano
docker compose down       # detener (conserva los datos)
docker compose down -v    # detener y borrar el volumen (resetea la base)
docker compose logs -f    # ver logs
pnpm prisma studio        # explorar los datos en el navegador
```

> El `DATABASE_URL` por defecto en `.env.example` ya apunta a este contenedor.

## Actualización: migración de juntas vecinales

La migración `20261015000000_neighborhood_associations` sustituye el texto libre
`Delivery.jv` por una referencia obligatoria al catálogo de juntas vecinales.

- **Base sin entregas:** se aplica normalmente. Después de migrar, genera el
  cliente de Prisma y registra las juntas en `/juntas-vecinales` cuando corresponda. Las nuevas
  entregas pueden registrarse sin junta.
- **Base con entregas existentes:** la migración se detiene antes de cambiar
  datos. No deduce números oficiales ni asociaciones a partir de `jv`.
  Se necesita un procedimiento de backfill revisado: identificar la junta
  correcta para cada texto antiguo, cargar su número y nombre, asociar cada
  entrega por id y comprobar que todas las referencias estén resueltas antes
  de retirar la columna anterior. Coordina ese procedimiento antes de desplegar
  esta rama sobre una base con entregas.

Para una base sin entregas, aplica las migraciones pendientes y actualiza el cliente:

```bash
pnpm prisma migrate deploy
pnpm prisma generate
```

No borres entregas ni uses un reset para saltarte esta protección. Tampoco edites
una migración ya aplicada en otras bases ni la marques como aplicada sin completar
y verificar sus cambios. Si un intento ya quedó registrado como fallido, la
recuperación del estado de Prisma debe formar parte del procedimiento revisado.

El modelo, las restricciones y la protección transaccional están documentados en
[specs/juntas-vecinales.md](./specs/juntas-vecinales.md).

## Autenticación

Autohospedada con Better Auth, **sólo correo + contraseña** (sin proveedores externos).

- Configuración del servidor: `src/lib/auth.ts` · cliente: `src/lib/auth-client.ts`
- Acceso restringido al dominio institucional (`ALLOWED_EMAIL_DOMAIN`, por defecto `nunoa.cl`).
- **No hay registro público** (`disableSignUp`): la primera cuenta se crea con `pnpm db:seed` y el resto las crea un administrador.
- Las contraseñas se guardan como hash scrypt en `account.password`; la tabla `user` nunca las contiene.
- Rutas protegidas: `src/proxy.ts` hace el filtro por cookie y `src/app/(app)/layout.tsx` valida la sesión contra la base de datos.
- Cerrar sesión (botón en la barra superior) revoca la sesión en la base de datos y redirige al login.

## Permisos por rol

Los usuarios normales gestionan entregas e insumos de cualquier autor y consultan
juntas vecinales y acciones estratégicas. Solo los administradores gestionan estos
dos catálogos y acceden a Solicitudes y Eventos. Los permisos se validan en el
servidor y se reflejan en la interfaz. La política también contempla actividades y
evidencia para sus futuros módulos.

Consulta la [matriz de permisos y verificación](./specs/permisos.md).

## Convenciones

- Usa `pnpm commit` (commitizen) en lugar de `git commit`. Husky valida formato con Prettier y mensajes con commitlint (conventional commits).
- Componentes shadcn en `src/components/ui/`, lógica compartida en `src/lib/`.

Más detalles para contribuir en [CLAUDE.md](./CLAUDE.md).
