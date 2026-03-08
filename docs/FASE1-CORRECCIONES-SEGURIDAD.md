# Fase 1 — Correcciones de Seguridad Urgentes
## Proyecto: acontplusgestionpedidos

> **Instrucciones para Cursor:** Aplica cada corrección en el orden indicado. Cada sección especifica el archivo exacto, el código a eliminar y el código de reemplazo. No modifiques ningún otro archivo que no esté listado aquí.

---

## Corrección 1 — JWT Secret hardcodeado

### 1A · `apps/backend/src/auth/auth.module.ts`

**Problema:** El secret JWT está hardcodeado en el código fuente. Cualquier persona con acceso al repositorio puede firmar tokens válidos y suplantar cualquier usuario.

**Acción:** Reemplazar `JwtModule.register()` por `JwtModule.registerAsync()` usando `ConfigService`.

**Reemplazar todo el contenido del archivo con:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CompaniesModule } from '../companies/companies.module';
import { RolesModule } from '../roles/roles.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    CompaniesModule,
    RolesModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
```

---

### 1B · `apps/backend/src/auth/strategies/jwt.strategy.ts`

**Problema:** El fallback `?? 'CLAVE_SECRETA_SUPER_SEGURA_2026'` en `secretOrKey` hace que la estrategia use el secret hardcodeado si la variable de entorno no está definida, anulando la corrección anterior.

**Buscar esta línea exacta:**

```typescript
secretOrKey: config.get<string>('JWT_SECRET') ?? 'CLAVE_SECRETA_SUPER_SEGURA_2026',
```

**Reemplazar por:**

```typescript
secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
```

---

### 1C · `apps/backend/.env.example`

**Problema:** La variable `JWT_SECRET` no está documentada en el archivo de ejemplo, lo que genera confusión al desplegar.

**Añadir al final del archivo:**

```bash
# =============================================================================
# Autenticación JWT
# =============================================================================
# Generar un valor seguro con:
#   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# NUNCA usar el mismo valor en desarrollo y producción.
JWT_SECRET=cambia-esto-por-una-cadena-aleatoria-de-al-menos-64-caracteres
```

---

## Corrección 2 — Endpoints sin autenticación

### 2A · `apps/backend/src/companies/companies.controller.ts`

**Problema:** Los endpoints `POST /`, `GET /`, `GET /:id` y `DELETE /:id` no tienen ningún guard y son completamente públicos. Cualquier persona puede listar, crear o eliminar empresas sin autenticarse.

**Reemplazar todo el contenido del archivo con:**

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ModuleEnabled } from '../common/decorators/module-enabled.decorator';

@Controller('companies')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id/subscription')
  assignSubscription(
    @Param('id') id: string,
    @Body() dto: AssignSubscriptionDto,
  ) {
    return this.companiesService.updateSubscription(id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, ModuleEnabledGuard)
  @ModuleEnabled('admin_company_config')
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
```

> **Nota para Cursor:** El `PATCH :id` conserva su propio `@UseGuards` con `ModuleEnabledGuard` porque necesita validar módulos activos del plan, que es distinto del `SuperAdminGuard` de nivel clase.

---

### 2B · `apps/backend/src/emission-points/emission-points.controller.ts`

**Problema:** Este controlador no tiene ningún guard ni importa `UseGuards`. Todos sus endpoints son públicos.

**Reemplazar todo el contenido del archivo con:**

```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { EmissionPointsService } from './emission-points.service';
import { CreateEmissionPointDto } from './dto/create-emission-point.dto';
import { UpdateEmissionPointDto } from './dto/update-emission-point.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModuleEnabledGuard } from '../common/guards/module-enabled.guard';
import { ModuleEnabled } from '../common/decorators/module-enabled.decorator';

@Controller('emission-points')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@ModuleEnabled('admin_establishments')
export class EmissionPointsController {
  constructor(private readonly emissionPointsService: EmissionPointsService) {}

  @Get('company/:companyId/limit-info')
  getLimitInfo(@Param('companyId') companyId: string) {
    return this.emissionPointsService.getEmissionPointLimitInfo(companyId);
  }

  @Post('establishment/:establishmentId')
  create(@Param('establishmentId') establishmentId: string, @Body() dto: CreateEmissionPointDto) {
    return this.emissionPointsService.create(establishmentId, dto);
  }

  @Get('establishment/:establishmentId')
  findAll(@Param('establishmentId') establishmentId: string) {
    return this.emissionPointsService.findAllByEstablishment(establishmentId);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.emissionPointsService.activate(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmissionPointDto) {
    return this.emissionPointsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emissionPointsService.remove(id);
  }
}
```

---

## Corrección 3 — Rate Limiting y Helmet

### 3A · Instalar dependencias

**Ejecutar en terminal desde `apps/backend/`:**

```bash
npm install @nestjs/throttler helmet
npm install --save-dev @types/helmet
```

---

### 3B · `apps/backend/src/app.module.ts`

**Problema:** No hay protección contra fuerza bruta ni limitación de requests por IP.

**Buscar la línea:**

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
```

**Reemplazar por:**

```typescript
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
```

**Buscar dentro del array `imports: [` la línea:**

```typescript
    ConfigModule.forRoot({ isGlobal: true }),
```

**Reemplazar por:**

```typescript
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
```

**Buscar el array `providers: [` dentro de `@Module`. Si no existe, crearlo. Añadir el guard global:**

```typescript
  providers: [
    AuditSubscriber,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
```

---

### 3C · `apps/backend/src/main.ts`

**Problema:** No se aplica Helmet (hardening de headers HTTP) ni se configura CORS desde variables de entorno.

**Buscar la línea:**

```typescript
import cookieParser from 'cookie-parser';
```

**Reemplazar por:**

```typescript
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
```

**Buscar el bloque completo:**

```typescript
  app.use(cookieParser());
```

**Reemplazar por:**

```typescript
  app.use(helmet());
  app.use(cookieParser());
```

**Buscar el bloque completo:**

```typescript
  // CORS: frontend Next.js suele ir en 3000, backend en 3001
  app.enableCors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });
```

**Reemplazar por:**

```typescript
  // CORS configurable por entorno — separar múltiples orígenes con coma en CORS_ORIGIN
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
```

---

### 3D · `apps/backend/src/auth/auth.controller.ts`

**Problema:** El endpoint de login no tiene límite de intentos, permitiendo ataques de fuerza bruta ilimitados.

**Buscar la línea del import principal (generalmente la primera línea):**

```typescript
import { Controller, Post, Body, Res, HttpCode, HttpStatus } from '@nestjs/common';
```

> Si los imports existentes son distintos, añadir `HttpCode, HttpStatus` si no están, y conservar los que ya existen.

**Añadir después de los imports existentes del controlador:**

```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';
```

**Buscar el decorador del método login. Ejemplo:**

```typescript
  @Post('login')
```

**Reemplazar por:**

```typescript
  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
```

---

### 3E · `apps/backend/.env.example`

**Añadir al final del archivo** (si no se hizo ya en la corrección 1C):

```bash
# =============================================================================
# CORS
# =============================================================================
# Separar múltiples orígenes con coma sin espacios
# Ejemplo producción: CORS_ORIGIN=https://tuapp.com,https://www.tuapp.com
CORS_ORIGIN=http://localhost:3000
```

---

## Corrección 4 — Middleware Next.js vacío

### 4A · `apps/web/middleware.ts`

**Problema:** El middleware está completamente vacío. Las rutas del dashboard (`/dashboard/*`) son accesibles sin autenticación si se conoce la URL directa.

**Reemplazar todo el contenido del archivo con:**

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/";

  // Redirigir a login si accede a ruta protegida sin sesión
  if (isProtectedRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirigir fuera de login/register si ya tiene sesión activa
  if (isAuthRoute && token && pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
```

---

## Verificación final

Después de aplicar todos los cambios, ejecutar:

```bash
# Backend — verificar que compila sin errores
cd apps/backend
npm run build

# Verificar que las variables de entorno están definidas en .env
# (JWT_SECRET y CORS_ORIGIN deben existir)

# Frontend — verificar que compila sin errores
cd apps/web
npm run build
```

### Checklist de archivos modificados

| # | Archivo | Estado esperado |
|---|---------|-----------------|
| 1A | `apps/backend/src/auth/auth.module.ts` | `JwtModule.registerAsync` con `ConfigService` |
| 1B | `apps/backend/src/auth/strategies/jwt.strategy.ts` | Sin fallback hardcodeado |
| 1C | `apps/backend/.env.example` | Variable `JWT_SECRET` documentada |
| 2A | `apps/backend/src/companies/companies.controller.ts` | `@UseGuards` a nivel de clase |
| 2B | `apps/backend/src/emission-points/emission-points.controller.ts` | Guards añadidos |
| 3A | Terminal `apps/backend/` | Dependencias instaladas |
| 3B | `apps/backend/src/app.module.ts` | `ThrottlerModule` + `APP_GUARD` |
| 3C | `apps/backend/src/main.ts` | `helmet()` + CORS desde env |
| 3D | `apps/backend/src/auth/auth.controller.ts` | `@Throttle` en login |
| 3E | `apps/backend/.env.example` | Variable `CORS_ORIGIN` documentada |
| 4A | `apps/web/middleware.ts` | Protección de rutas activa |

> **Importante:** Después de aplicar los cambios, asegúrate de que el archivo `.env` (no `.env.example`) tenga definidos los valores reales de `JWT_SECRET` y `CORS_ORIGIN` antes de iniciar el servidor.
