# Parque Tempisque Home — Setup

Home multiusuario con **SSO de Microsoft (Entra ID)**, **PostgreSQL**, tablero
**Workspace** (herramientas base del admin) + **Favoritos** por usuario, y
**Noticias** segmentadas por grupo.

## 1. PostgreSQL

En desarrollo local levanta la BD con Docker:

```bash
docker compose up -d postgres
```

La app se conecta con `DATABASE_URL` (ver `.env`). En producción (dokploy) el
servicio `postgres` del `docker-compose.yml` corre junto a la app; el host de la
cadena de conexión es `postgres`.

## 2. Microsoft Entra ID (SSO, single tenant)

1. [entra.microsoft.com](https://entra.microsoft.com) → **App registrations → New registration**.
2. **Supported account types:** *Accounts in this organizational directory only (Single tenant)*.
3. **Redirect URI** (Web):
   - prod: `https://home.parquetempisque.dev/api/auth/callback`
   - dev:  `http://localhost:5173/api/auth/callback`
4. Copia **Application (client) ID** → `AZURE_CLIENT_ID` y **Directory (tenant) ID** → `AZURE_TENANT_ID`.
5. **Certificates & secrets → New client secret** → copia el *Value* → `AZURE_CLIENT_SECRET`.
6. **API permissions:** Microsoft Graph → `User.Read` (`openid`, `profile`, `email`) ya viene por defecto.

Rellena en `.env` / dokploy: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`,
`AZURE_REDIRECT_URI`, `APP_BASE_URL`. Sin estas variables, el botón de Microsoft
responde 503 y se puede entrar con el password de respaldo.

## 3. Roles y acceso

- **Admin:** correos en `ADMIN_EMAILS` (separados por coma) reciben rol `admin`
  al entrar por SSO. Gestionan Workspace, categorías, grupos y noticias.
- **Password de respaldo:** `APP_PASSWORD` entra como el admin bootstrap
  (`BOOTSTRAP_ADMIN_EMAIL`). Útil para configurar antes de tener SSO.
- **Miembros:** cualquier cuenta del tenant. Ven el Workspace y publican sus
  propios Favoritos (persistentes por usuario).

## 4. Desarrollo

```bash
docker compose up -d postgres   # BD
pnpm install
pnpm dev                        # web (5173) + api (3001)
```

Variables en `.env` (ver `.env.example`).
