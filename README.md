# Medialuna · mercado campesino digital (MVP Parcial I)

## Stack tecnológico

Next.js 16 · Better Auth · Tailwind CSS 4 · Drizzle ORM · Turso (libsql). 

**Arquitectura y diagramas**: [docs/arquitectura.md](docs/arquitectura.md).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env     # definir BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:setup            # migra y siembra perfiles + administrador
pnpm dev                 # http://localhost:3000
```

- Sin `TURSO_DATABASE_URL` usa `file:local.db`. Para Turso: `turso db create`, `turso db tokens create` y completar `.env`.
- Correo de recuperación: `RESEND_API_KEY` (y `MAIL_FROM`). Sin dominio verificado, Resend solo entrega al correo de la cuenta propietaria. Sin clave, el correo se imprime en consola.
- Administrador sembrado: `SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD` (por defecto `admin` / `Admin12345`; cámbielos y ponga su correo real en `SEED_ADMIN_EMAIL`).

## Verificación

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```
