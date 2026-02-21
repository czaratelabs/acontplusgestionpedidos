# Auditoría: Límites de Plan vs Permisos de Rol

## Principios aplicados

1. **Plan (Módulos):** Determina si el módulo es accesible. Si `modules.key === false`, todo el módulo se bloquea.
2. **Plan (Límites):** Determina CANTIDAD. Solo aplica a CREACIÓN (`POST` / `create`).
3. **Roles (Permissions):** Determina ACCIONES (`view`, `edit`, `delete`, `annull`). Independiente de los límites del plan.

---

## Task 1: Auditoría Backend

### assertResourceLimit – solo en create

| Módulo       | Método                  | ¿Llama assertResourceLimit? | Estado    |
|-------------|-------------------------|-----------------------------|-----------|
| establishments | `create()`            | ✅ Sí (max_establishments)   | Correcto  |
| warehouses    | `create()`            | ✅ Sí (max_warehouses)       | Correcto  |
| users         | `createEmployee()`    | ✅ Sí (max_sellers)          | Correcto  |
| users         | `assignUserToCompany()` | ✅ Sí (max_sellers)        | Correcto  |
| contacts      | `create()`            | ❌ No (sin límite en plan)   | N/A       |
| emission-points | `create()`          | ❌ No (sin límite en plan)   | N/A       |

### update / patch / delete – no usan checkResourceLimit

- Ningún método `update`, `remove`, `activate` llama `assertResourceLimit`. ✅

### ModuleEnabledGuard / ContactsModuleGuard

- Verifica solo si el módulo está habilitado en el plan.
- Resuelve correctamente `companyId` para rutas con `params.id`:
  - `/establishments/:id` → `getCompanyIdFromEstablishmentId`
  - `/warehouses/:id` → `getCompanyIdFromWarehouseId`
  - `/contacts/:id` → `getCompanyIdFromContactId` (ContactsModuleGuard)
- No bloquea update/delete si el módulo está activo y el `companyId` se resuelve bien.

---

## Task 2: CompaniesService

- `checkResourceLimit`: clarificado que valida `Current Count < Max Allowed`.
- `assertResourceLimit`: mensaje de error unificado: "Límite de registros alcanzado... Mejora tu plan."
- Bypass SUPER_ADMIN: si el usuario es SUPER_ADMIN, todas las comprobaciones devuelven `true`.

---

## Task 3: Frontend

- **Sidebar (LockedMenuItem):** Lock solo cuando el módulo está deshabilitado en el plan. ✅
- **"Nuevo [Recurso]":** No hay modal de Upgrade Plan previo; si se alcanza el límite, el API responde 403 y el toast muestra el mensaje. ✅
- **Editar / Anular / Inactivar:** No hay lógica de plan que las deshabilite; solo errores de permisos si el API responde 403 por rol (cuando exista RoleGuard). ✅

---

## Resumen de cambios

1. **CompaniesService:** ClsService inyectado, bypass SUPER_ADMIN, mensaje de error unificado.
2. **ModuleEnabledGuard:** Resolución de `companyId` para establishments y warehouses.
3. **ContactsModuleGuard:** Resolución de `companyId` desde `params.id` (contact id) en PATCH/DELETE.
4. **CompaniesModule:** Importación de entidad `Contact` para `getCompanyIdFromContactId`.
5. **CompaniesService:** Nuevos métodos `getCompanyIdFromContactId` y `getCompanyIdFromWarehouseId`.
