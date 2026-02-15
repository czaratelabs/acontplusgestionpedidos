# Migración: User Multi-Company & Roles

## ⚠️ IMPORTANTE: Ejecutar ANTES de iniciar la aplicación

Esta migración:
1. Crea la tabla `roles` e inserta 'owner', 'admin', 'seller'
2. Crea la tabla `user_companies` (User ↔ Company ↔ Role)
3. **Migra** los datos existentes de `users.company_id` y `users.role` a `user_companies`
4. Elimina las columnas `company_id` y `role` de `users`

## Cómo ejecutar

```bash
cd apps/backend
pnpm run migration:run
# o
npm run migration:run
```

Luego reinicia el backend:

```bash
pnpm run start:dev
```

## Resultado

- Un usuario puede pertenecer a **múltiples empresas** con **roles distintos** por empresa.
- Ejemplo: Usuario A → Empresa 1 (admin), Empresa 2 (seller).

## Si la migración no pudo migrar datos

Si la tabla `users` ya no tenía `company_id` o `role` (ej. por `synchronize: true` previo), la migración no migra datos. En ese caso:

1. **Registrar nueva cuenta**: crea empresa + usuario + asignación.
2. **Asignar usuarios existentes manualmente** (reemplaza IDs):

```sql
-- Asignar usuario existente a una empresa
INSERT INTO user_companies (user_id, company_id, role_id, is_active)
SELECT 
  'USER_UUID_AQUI',
  'COMPANY_UUID_AQUI',
  (SELECT id FROM roles WHERE name = 'admin' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM user_companies 
  WHERE user_id = 'USER_UUID_AQUI' AND company_id = 'COMPANY_UUID_AQUI'
);
```
