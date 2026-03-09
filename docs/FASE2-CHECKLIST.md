# Fase 2: Calidad y Mantenibilidad — Checklist por archivo

> Basado en el análisis técnico de acontplusgestionpedidos (marzo 2026)  
> Objetivo: Tests, cliente HTTP centralizado, paginación y documentación  
> Duración estimada: 2–4 semanas

---

## 1. Tarea 2.1: Tests unitarios e integración

**Meta:** ~70% de cobertura en servicios críticos.

### 2.1.1 `apps/backend/src/auth/auth.service.spec.ts`

| # | Caso de prueba | Estado |
|---|----------------|--------|
| 2.1.1.1 | Login con credenciales válidas → retorna JWT y usuario | ☑ |
| 2.1.1.2 | Login con credenciales inválidas → lanza UnauthorizedException | ☑ |
| 2.1.1.3 | Generación correcta de JWT (payload: sub, email, role, companyId) | ☑ |
| 2.1.1.4 | `register()` crea usuario y empresa correctamente | ☑ |
| 2.1.1.5 | `selectCompany()` actualiza companyId en token | ☑ |

### 2.1.2 `apps/backend/src/articles/articles.service.spec.ts`

| # | Caso de prueba | Estado |
|---|----------------|--------|
| 2.1.2.1 | Crear artículo con variantes | ☑ |
| 2.1.2.2 | Búsqueda por código de barras (barcode principal y adicionales) | ☑ |
| 2.1.2.3 | Full-Text Search (FTS) por nombre | ☑ |
| 2.1.2.4 | Verificación de límites de plan (max_inventory_items) | ☑ |
| 2.1.2.5 | Validación de barcode duplicado | ☑ |

### 2.1.3 `apps/backend/src/contacts/contacts.service.spec.ts`

| # | Caso de prueba | Estado |
|---|----------------|--------|
| 2.1.3.1 | Normalización RUC: cédula 10 dígitos → RUC 13 dígitos (+001) | ☑ |
| 2.1.3.2 | Upsert inteligente cédula→RUC | ☑ |
| 2.1.3.3 | Tipos de documento SRI (C, R, P, F) | ☑ |
| 2.1.3.4 | Validación de RUC ecuatoriano | ☑ |

### 2.1.4 `apps/backend/src/business-rules/business-rules.service.spec.ts`

| # | Caso de prueba | Estado |
|---|----------------|--------|
| 2.1.4.1 | Validación stock negativo (permite/deniega según regla) | ☑ |
| 2.1.4.2 | Lectura de reglas por empresa | ☑ |
| 2.1.4.3 | Valores por defecto si no hay reglas configuradas | ☑ |

### 2.1.5 Tests e2e `apps/backend/test/`

| # | Caso de prueba | Estado |
|---|----------------|--------|
| 2.1.5.1 | Flujo login → token → request protegido | ☑ |
| 2.1.5.2 | Flujo gestión inventario (crear artículo, buscar) | ☑ |
| 2.1.5.3 | Flujo planes/límites (límite de recursos) | ☑ |

---

## 2. Tarea 2.2: Cliente HTTP centralizado (frontend)

### 2.2.1 Crear `apps/web/lib/api-client.ts` (o equivalente)

| # | Acción | Estado |
|---|--------|--------|
| 2.2.1.1 | Crear archivo con API_BASE centralizada (NEXT_PUBLIC_API_URL) | ☑ |
| 2.2.1.2 | Implementar método `apiGet(url, opts?)` | ☑ |
| 2.2.1.3 | Implementar método `apiPost(url, body?, opts?)` | ☑ |
| 2.2.1.4 | Implementar método `apiPatch(url, body?, opts?)` | ☑ |
| 2.2.1.5 | Implementar método `apiPut(url, body?, opts?)` | ☑ |
| 2.2.1.6 | Implementar método `apiDelete(url, opts?)` | ☑ |
| 2.2.1.7 | Usar `credentials: 'include'` en todas las peticiones | ☑ |
| 2.2.1.8 | Header por defecto `Content-Type: application/json` | ☑ |
| 2.2.1.9 | Interceptor 401 → redirect a `/login` | ☑ |
| 2.2.1.10 | Manejo centralizado de errores (opcional: toast) | ☑ |

### 2.2.2 Migrar usos de `fetch` al cliente centralizado

| # | Archivo / ubicación | Estado |
|---|---------------------|--------|
| 2.2.2.1 | Buscar todos los archivos con `fetch(API_BASE` o `fetch(process.env...` | ☑ |
| 2.2.2.2 | Reemplazar en `app/login/page.tsx` | ☑ |
| 2.2.2.3 | Reemplazar en páginas de dashboard (pos, business-rules, etc.) | ☑ |
| 2.2.2.4 | Reemplazar en componentes (contact-list, contact-dialog) | ☑ |
| 2.2.2.5 | Eliminar constantes `API_BASE` duplicadas (parcial: en archivos migrados) | ☑ |

---

## 3. Tarea 2.3: Paginación consistente

### 2.3.1 Backend — DTO genérico

| # | Archivo | Acción | Estado |
|---|---------|--------|--------|
| 2.3.1.1 | `apps/backend/src/common/dto/pagination.dto.ts` | Crear DTO con `page`, `limit` | ☑ |
| 2.3.1.2 | `pagination.dto.ts` | Validaciones: `@IsInt()`, `@Min(1)`, `@Max(100)` | ☑ |
| 2.3.1.3 | `apps/backend/src/common/` | Crear interface `PaginatedResponse<T>` | ☑ |

### 2.3.2 Aplicar paginación en endpoints

| # | Endpoint / módulo | Estado |
|---|-------------------|--------|
| 2.3.2.1 | `GET /contacts` (findAllByCompany) | ☑ |
| 2.3.2.2 | `GET /articles` (findAll / search) | ☑ |
| 2.3.2.3 | `GET /users` (findAllByCompany) | ☑ |
| 2.3.2.4 | `GET /audit-logs` (unificar formato si ya tiene paginación) | ☑ |
| 2.3.2.5 | Otros endpoints findAll que devuelvan listas grandes | ☑ |

### 2.3.3 Formato de respuesta

| # | Acción | Estado |
|---|--------|--------|
| 2.3.3.1 | Devolver siempre `{ data: T[], total: number, page: number, limit: number }` | ☑ |

### 2.3.4 Frontend — Componente paginación (opcional)

| # | Acción | Estado |
|---|--------|--------|
| 2.3.4.1 | Crear o ajustar componente de paginación reutilizable | ☐ |
| 2.3.4.2 | Integrar con formato de respuesta del backend | ☐ |

---

## 4. Tarea 2.4: Estabilizar versiones del frontend

### 2.4.1 `apps/web/package.json`

| # | Acción | Estado |
|---|--------|--------|
| 2.4.1.1 | Cambiar `next` de canary a versión estable (ej: `15.3.x`) | ☐ Diferido |
| 2.4.1.2 | Cambiar `react` y `react-dom` de RC a `18.3.x` | ☐ Diferido |
| 2.4.1.3 | Ejecutar `npm install` | — |
| 2.4.1.4 | Ejecutar `npm run build` y corregir incompatibilidades | — |
| 2.4.1.5 | Verificar compatibilidad Radix UI, react-hook-form, etc. | — |

**Nota:** El proyecto usa Next 16 canary + React 19 RC. El downgrade a 15.3/18.3 introdujo incompatibilidades (eslint, zod, types). Se recomienda evaluar cuando Next 15/React 18 sea requerido.

---

## 5. Tarea 2.5: Documentación OpenAPI / Swagger

### 2.5.1 Instalación y configuración

| # | Acción | Estado |
|---|--------|--------|
| 2.5.1.1 | Ejecutar `npm install @nestjs/swagger` en `apps/backend` | ☑ |
| 2.5.1.2 | Configurar `DocumentBuilder` en `main.ts` | ☑ |
| 2.5.1.3 | Montar Swagger en ruta `/api/docs` | ☑ |

### 2.5.2 Decoradores en controllers

| # | Controller | Acción | Estado |
|---|------------|--------|--------|
| 2.5.2.1 | `auth.controller.ts` | `@ApiTags('auth')` y `@ApiOperation` en endpoints | ☑ |
| 2.5.2.2 | `companies.controller.ts` | `@ApiTags('companies')` y documentar endpoints | ☑ |
| 2.5.2.3 | `articles.controller.ts` | `@ApiTags('articles')` y documentar endpoints | ☑ |
| 2.5.2.4 | `contacts.controller.ts` | `@ApiTags('contacts')` y documentar endpoints | ☑ |
| 2.5.2.5 | Otros controllers | `@ApiTags`, `@ApiOperation`, `@ApiResponse` | ☐ Opcional |

### 2.5.3 Documentar DTOs

| # | Acción | Estado |
|---|--------|--------|
| 2.5.3.1 | Añadir `@ApiProperty()` a DTOs principales | ☐ Opcional |
| 2.5.3.2 | Documentar autenticación (Bearer/JWT) en Swagger | ☑ (addBearerAuth) |

---

## Resumen por tarea

| Tarea | Total ítems | Prioridad | Orden sugerido |
|-------|-------------|-----------|----------------|
| 2.1 Tests unitarios | 22 | P0 | 2 |
| 2.2 Cliente HTTP | 15 | P0 | 1 |
| 2.3 Paginación | 11 | P1 | 3 |
| 2.4 Versiones frontend | 5 | P1 | 4 |
| 2.5 Swagger | 10 | P2 | 5 |

---

## Orden de trabajo recomendado

1. **2.2** Cliente HTTP centralizado → impacto inmediato en mantenibilidad  
2. **2.1** Tests unitarios → empezar por `auth.service`, `articles.service`  
3. **2.3** Paginación → DTO + endpoints + formato respuesta  
4. **2.4** Versiones frontend → `package.json` + ajustes de compatibilidad  
5. **2.5** Swagger → setup + decoradores en controllers y DTOs  

---

## Criterios de cierre Fase 2

- [x] Cliente HTTP centralizado en uso (sin `API_BASE` duplicada)
- [x] Tests unitarios para auth, articles, contacts y business-rules
- [x] Al menos un test e2e de flujo login
- [x] Paginación aplicada en endpoints de listado principales
- [ ] Frontend con versiones estables (Next 15.x, React 18.x) — diferido
- [x] Swagger disponible en `/api/docs` con documentación básica
