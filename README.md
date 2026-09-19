# Antídoto

Landing de misiones de bienestar y portal de administración. Next.js (App Router) sobre Vercel, con base de datos en Turso.

## Desarrollo local

Turso ofrece un servidor local que habla el mismo protocolo HTTP que la nube, así que no hace falta una base remota para desarrollar:

```bash
turso dev --db-file local-dev.db    # deja esto corriendo en otra terminal
cp .env.example .env.local          # y pon TURSO_DATABASE_URL=http://127.0.0.1:8080
npm run db:migrate
npm run db:seed                     # crea el primer superadmin con SEED_ADMIN_*
npm run dev
```

## Base de datos

- `db/schema.sql` es el esquema completo, idempotente (`CREATE TABLE IF NOT EXISTS`).
- `npm run db:migrate` lo aplica; `npm run db:seed` carga las misiones, los textos legales y el superadmin inicial.
- Las métricas (participantes, avance, promedio) no se guardan: se calculan desde `participations` en cada consulta, así nunca quedan desincronizadas.
- El estado `vencido` tampoco se guarda: se deriva de `expires_at`.

El cliente se importa desde `@libsql/client/web` a propósito. El import por defecto arrastra unos 19 MB de binarios nativos que solo sirven para bases embebidas y no hacen falta contra Turso.

## Despliegue en Vercel

1. Crear la base y el token:

   ```bash
   turso db create antidoto
   turso db show antidoto --url
   turso db tokens create antidoto
   ```

2. Cargar `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en las variables de entorno del proyecto (`vercel env add`), para Production y Preview.

3. Aplicar el esquema contra la base remota apuntando `.env.local` a ella y corriendo `npm run db:migrate` y `npm run db:seed`.

Las variables `SEED_ADMIN_*` solo las usa el script de seed; no se leen en runtime y no hace falta cargarlas en Vercel.

## Usuarios del portal

- **Superadmin**: ve todas las empresas, gestiona empresas, textos legales y auditoría.
- **Admin de empresa**: solo ve los grupos y códigos de su empresa. El filtro se aplica en el servidor, no en el cliente.

El seed crea el primer superadmin. Los demás usuarios todavía se crean a mano en la tabla `admin_users` (contraseña con el mismo formato `scrypt$salt$hash` que genera `scripts/seed.mjs`); no hay pantalla para gestionarlos.
