# Fase 1: Seguridad Crítica — Checklist por archivo

> Basado en el análisis técnico de acontplusgestionpedidos (marzo 2026)  
> Orden sugerido: 1.1 → 1.2 → 1.3 → 1.4 → 1.5

---

## 1. Tarea 1.1: Corregir Secret JWT

### `apps/backend/src/auth/auth.module.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.1.1 | Reemplazar `JwtModule.register()` por `JwtModule.registerAsync()` | ☑ |
| 1.1.2 | Importar `ConfigModule` en `imports` | ☑ |
| 1.1.3 | Usar `useFactory` con `ConfigService` y `config.getOrThrow<string>('JWT_SECRET')` | ☑ |
| 1.1.4 | Eliminar el literal `'CLAVE_SECRETA_SUPER_SEGURA_2026'` | ☑ |
| 1.1.5 | Mantener `signOptions: { expiresIn: '1d' }` (o pasarlo a variable) | ☑ |
| 1.1.6 | Añadir `inject: [ConfigService]` en `registerAsync` | ☑ |

### `apps/backend/src/auth/strategies/jwt.strategy.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.1.7 | Reemplazar `config.get<string>('JWT_SECRET') ?? 'CLAVE_SECRETA_SUPER_SEGURA_2026'` por `config.getOrThrow<string>('JWT_SECRET')` | ☑ |
| 1.1.8 | Eliminar fallback hardcodeado completamente | ☑ |

### `apps/backend/.env.example`

| # | Acción | Estado |
|---|--------|--------|
| 1.1.9 | Añadir sección "Autenticación JWT" | ☑ |
| 1.1.10 | Documentar `JWT_SECRET=` con ejemplo (ej: generar con `openssl rand -base64 32`) | ☑ |

### `apps/backend/README.md`

| # | Acción | Estado |
|---|--------|--------|
| 1.1.11 | Documentar variable `JWT_SECRET` en sección de variables de entorno | ☑ |

### `.env` (local, no versionado)

| # | Acción | Estado |
|---|--------|--------|
| 1.1.12 | Crear o actualizar `.env` local con `JWT_SECRET=<cadena-aleatoria-256-bits>` | ☐ |

---

## 2. Tarea 1.2: Proteger Endpoints

### `apps/backend/src/companies/companies.controller.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.2.1 | Añadir `@UseGuards(JwtAuthGuard, SuperAdminGuard)` a `POST /` (create) | ☑ |
| 1.2.2 | Añadir `@UseGuards(JwtAuthGuard, SuperAdminGuard)` a `GET /` (findAll) | ☑ |
| 1.2.3 | Añadir `@UseGuards(JwtAuthGuard)` a `GET /:id` (findOne) | ☑ |
| 1.2.4 | Añadir `@UseGuards(JwtAuthGuard, SuperAdminGuard)` a `DELETE /:id` (remove) | ☑ |
| 1.2.5 | Decidir si `POST /` debe ser público para registro inicial — si no, proteger con SuperAdminGuard | ☑ |

### `apps/backend/src/app.module.ts` (opcional: enfoque global)

| # | Acción | Estado |
|---|--------|--------|
| 1.2.6 | Si usas enfoque global: registrar `APP_GUARD` con `JwtAuthGuard` | ☐ |
| 1.2.7 | Si usas enfoque global: marcar rutas públicas con `@Public()` | ☐ |
| 1.2.8 | Si NO usas global: verificar que todos los controllers sensibles tengan guards explícitos | ☐ |

### Verificación de otros controllers

| # | Archivo | Acción | Estado |
|---|---------|--------|--------|
| 1.2.9 | `auth/auth.controller.ts` | Confirmar que login, register, select-company tienen `@Public()` | ☐ |
| 1.2.10 | `users/users.controller.ts` | Confirmar que todos los endpoints tienen JwtAuthGuard | ☐ |
| 1.2.11 | `articles/articles.controller.ts` | Confirmar JwtAuthGuard | ☐ |
| 1.2.12 | `contacts/contacts.controller.ts` | Confirmar JwtAuthGuard | ☐ |

---

## 3. Tarea 1.3: Rate Limiting y Helmet

### Dependencias

| # | Acción | Estado |
|---|--------|--------|
| 1.3.1 | Ejecutar `npm install @nestjs/throttler helmet` en `apps/backend` | ☑ |

### `apps/backend/src/app.module.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.3.2 | Importar `ThrottlerModule` | ☑ |
| 1.3.3 | Añadir `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` en imports | ☑ |
| 1.3.4 | Opcional: registrar `APP_GUARD` con `ThrottlerGuard` para throttling global | ☑ |
| 1.3.5 | Opcional: usar `THROTTLE_TTL` y `THROTTLE_LIMIT` desde variables de entorno | ☑ |

### `apps/backend/src/auth/auth.controller.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.3.6 | Importar `Throttle` de `@nestjs/throttler` | ☑ |
| 1.3.7 | Añadir `@Throttle({ default: { limit: 5, ttl: 60000 } })` al método `signIn` | ☑ |

### `apps/backend/src/app.controller.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.3.8 | Importar `SkipThrottle` de `@nestjs/throttler` | ☐ |
| 1.3.9 | Añadir `@SkipThrottle()` a endpoints de health (si existen) | ☐ |

### `apps/backend/src/main.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.3.10 | Importar `helmet` | ☑ |
| 1.3.11 | Añadir `app.use(helmet())` antes de `enableCors` (o donde corresponda según documentación) | ☑ |
| 1.3.12 | Verificar que no rompa CORS o el frontend (ajustar si necesario) | ☑ |

---

## 4. Tarea 1.4: CORS configurable

### `apps/backend/src/main.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.4.1 | Reemplazar `origin: ['http://localhost:3000', 'http://127.0.0.1:3000']` por `origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://127.0.0.1:3000']` | ☑ |
| 1.4.2 | Mantener `credentials: true` | ☑ |
| 1.4.3 | Opcional: trimear espacios con `process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean)` | ☑ |

### `apps/backend/.env.example`

| # | Acción | Estado |
|---|--------|--------|
| 1.4.4 | Añadir línea `# CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000` con comentario | ☑ |
| 1.4.5 | Añadir ejemplo producción: `# CORS_ORIGIN=https://app.tudominio.com` | ☑ |

### `apps/backend/README.md`

| # | Acción | Estado |
|---|--------|--------|
| 1.4.6 | Documentar variable `CORS_ORIGIN` en sección variables de entorno | ☑ |

---

## 5. Tarea 1.5: Middleware Next.js

### `apps/web/middleware.ts`

| # | Acción | Estado |
|---|--------|--------|
| 1.5.1 | Importar `NextRequest`, `NextResponse` (si no están) | ☑ |
| 1.5.2 | Obtener cookie `token` con `request.cookies.get('token')?.value` | ☑ |
| 1.5.3 | Definir rutas públicas: `/login`, `/register`, `/_next`, `/favicon.ico`, archivos estáticos | ☑ |
| 1.5.4 | Si pathname empieza con `/dashboard` y NO hay token → `NextResponse.redirect(new URL('/login', request.url))` | ☑ |
| 1.5.5 | Opcional: preservar URL destino en query param para redirect post-login (`redirect=/dashboard/xxx`) | ☑ |
| 1.5.6 | Retornar `NextResponse.next()` cuando la ruta sea pública o exista token | ☑ |
| 1.5.7 | Verificar que el matcher actual incluya rutas `/dashboard/*` | ☑ |

**Nota:** La cookie de autenticación es `token` (usada en login: `Cookies.set("token", data.access_token, ...)`).

---

## Resumen por archivo

| Archivo | Total ítems | Orden sugerido |
|---------|-------------|----------------|
| `apps/backend/src/auth/auth.module.ts` | 6 | 1 |
| `apps/backend/src/auth/strategies/jwt.strategy.ts` | 2 | 1 |
| `apps/backend/src/auth/auth.controller.ts` | 2 | 3 |
| `apps/backend/src/companies/companies.controller.ts` | 5 | 2 |
| `apps/backend/src/app.module.ts` | 4-5 | 3 |
| `apps/backend/src/app.controller.ts` | 2 | 3 |
| `apps/backend/src/main.ts` | 5 | 3-4 |
| `apps/web/middleware.ts` | 7 | 5 |
| `apps/backend/.env.example` | 4 | 1, 4 |
| `apps/backend/README.md` | 2 | 1, 4 |
| `apps/backend/package.json` (instalación) | 1 | 3 |
| `.env` (local) | 1 | 1 |

---

## Orden de trabajo recomendado

1. **1.1 JWT** → `auth.module.ts`, `jwt.strategy.ts`, `.env.example`, `README.md`, `.env` local  
2. **1.2 Guards** → `companies.controller.ts`  
3. **1.3 Throttler + Helmet** → `package.json` (npm install), `app.module.ts`, `auth.controller.ts`, `app.controller.ts`, `main.ts`  
4. **1.4 CORS** → `main.ts`, `.env.example`, `README.md`  
5. **1.5 Middleware** → `apps/web/middleware.ts`

---

## Criterios de cierre Fase 1

- [x] No existe literal `'CLAVE_SECRETA_SUPER_SEGURA_2026'` en el código
- [x] `GET /companies` y `DELETE /companies/:id` requieren autenticación
- [x] Login limitado a 5 intentos/minuto por IP
- [x] Headers HTTP protegidos con Helmet
- [x] CORS configurable vía `CORS_ORIGIN`
- [x] Rutas `/dashboard/*` redirigen a login si no hay sesión
