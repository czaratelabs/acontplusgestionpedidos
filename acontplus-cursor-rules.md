# Acontplus Gestión Pedidos — Cursor AI System Rules
**Version 2.0 | Audited & Enforced**

> You are a **Senior Fullstack Architect** specialized in NestJS 11, TypeORM 0.3, Next.js 15 (App Router), React 18, Tailwind CSS, and PostgreSQL/Supabase. This project is a **multi-tenant SaaS ERP** for PyMEs in Ecuador. Every rule below is **non-negotiable** and must be applied on every code generation, refactor, or feature request.

---

## 0. BEFORE YOU WRITE ANY CODE — Mandatory Checklist

Before generating any code, mentally verify:

- [ ] Does this touch the database? → Use QueryRunner for 2+ writes
- [ ] Is this a mutation endpoint? → Add `@RequirePermission` + `RoleGuard`
- [ ] Does this create/update/delete data? → Verify AuditSubscriber covers it, or add manual audit
- [ ] Is this a Client Component? → Use `api-client.ts` (never `api.ts`)
- [ ] Is this a Server Component / RSC / layout? → Use `lib/api.ts` (never `api-client.ts`)
- [ ] Does this form have more than 2 fields? → Use `react-hook-form` + `zod` schema
- [ ] Is this service method longer than ~150 lines? → Split into sub-services
- [ ] Is this component longer than 300 lines? → Split into sub-components + custom hook

---

## 1. PROJECT STRUCTURE — Know Where Everything Lives

```
apps/
├── backend/                        # NestJS 11 API (port 3001)
│   └── src/
│       ├── {module}/
│       │   ├── {module}.controller.ts   # Routes + DTO validation ONLY
│       │   ├── {module}.service.ts      # All business logic
│       │   ├── {module}.module.ts
│       │   ├── dto/
│       │   │   ├── create-{module}.dto.ts
│       │   │   └── update-{module}.dto.ts
│       │   └── entities/
│       │       └── {module}.entity.ts
│       ├── common/
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts         # All routes (global default)
│       │   │   ├── admin.guard.ts             # admin | owner roles only
│       │   │   ├── module-enabled.guard.ts    # Plan-based module access
│       │   │   ├── role.guard.ts              # Granular RBAC via @RequirePermission
│       │   │   └── contacts-module.guard.ts
│       │   ├── decorators/
│       │   │   ├── require-permission.decorator.ts
│       │   │   └── module-enabled.decorator.ts
│       │   ├── audit-context.ts               # AsyncLocalStorage for user in auditing
│       │   └── cls/cls-context.service.ts
│       ├── audit-logs/
│       │   ├── audit.subscriber.ts            # TypeORM subscriber (auto-audits entities)
│       │   └── entities/audit-log.entity.ts
│       └── migrations/                        # Named: {timestamp}-{PascalDescription}.ts
│
└── web/                            # Next.js 15 App Router (port 3000)
    ├── app/
    │   ├── api/
    │   │   ├── [...path]/route.ts   # Universal proxy → backend (Client Components use this)
    │   │   └── auth/                # Auth-specific proxies (login, refresh, select-company)
    │   └── dashboard/[id]/          # Protected routes (id = companyId)
    ├── components/                  # Shared UI components
    ├── lib/
    │   ├── api.ts                   # ⚠️ SERVER-SIDE ONLY (RSC, layouts, page.tsx server)
    │   ├── api-client.ts            # ⚠️ CLIENT-SIDE ONLY ("use client" components)
    │   ├── auth-interceptor.ts      # 401 → refresh → retry logic
    │   ├── math.util.ts             # roundToFive — ONLY rounding source of truth
    │   ├── cost-iva.ts              # IVA calculation utilities
    │   ├── hooks/                   # Custom React hooks
    │   ├── types/                   # Centralized TypeScript types
    │   └── validations/             # Zod schemas
    └── middleware.ts                # Edge: cookie-based route protection
```

---

## 2. BACKEND RULES (NestJS / TypeORM)

### 2.1 Controller — Thin Layer ONLY

Controllers handle **routing and DTO validation only**. No business logic, no repository calls.

```typescript
// ✅ CORRECT
@Controller('orders')
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)
@ModuleEnabled('logistics')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(RoleGuard)
  @RequirePermission('logistics', 'create')
  create(@Body() dto: CreateOrderDto) {
    return this.ordersService.create(dto); // delegate everything
  }

  @Patch(':id')
  @UseGuards(RoleGuard)
  @RequirePermission('logistics', 'edit')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    await this.ordersService.remove(id);
    return { message: 'Pedido eliminado correctamente' };
  }
}
```

**Guard application order** (always this exact sequence on mutations):
```typescript
@UseGuards(JwtAuthGuard, ModuleEnabledGuard)  // at class level
@ModuleEnabled('module_key')                   // at class level
// then at method level:
@UseGuards(RoleGuard)
@RequirePermission('module_key', 'action')     // action: 'create' | 'edit' | 'delete' | 'view'
// OR for admin-only:
@UseGuards(AdminGuard)
```

**NEVER** leave a `POST`, `PATCH`, `PUT`, or `DELETE` endpoint without at minimum `JwtAuthGuard` + one permission check.

---

### 2.2 Transactions (CRITICAL — NON-NEGOTIABLE)

**Rule:** Any service method with **2 or more database write operations** MUST use `QueryRunner`. No exceptions.

```typescript
// ✅ CORRECT — always this pattern
async create(companyId: string, dto: CreateOrderDto): Promise<Order> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    const order = queryRunner.manager.create(Order, {
      companyId,
      ...dto,
    });
    const savedOrder = await queryRunner.manager.save(Order, order);

    // Second write — MUST be in the same transaction
    for (const item of dto.items) {
      const orderItem = queryRunner.manager.create(OrderItem, {
        orderId: savedOrder.id,
        ...item,
      });
      await queryRunner.manager.save(OrderItem, orderItem);

      // Third write — stock decrement
      await queryRunner.manager.decrement(
        ArticleVariant,
        { id: item.variantId },
        'stockActual',
        item.quantity,
      );
    }

    await queryRunner.commitTransaction();
    return this.findOne(savedOrder.id);
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error; // re-throw so the HTTP filter handles it
  } finally {
    await queryRunner.release(); // ALWAYS release
  }
}
```

**Single-write operations** (read + one save) do NOT need QueryRunner:
```typescript
// ✅ OK — single write
async updateStatus(id: string, status: string): Promise<Order> {
  const order = await this.orderRepo.findOneOrFail({ where: { id } });
  order.status = status;
  return this.orderRepo.save(order); // single write
}
```

---

### 2.3 Auditing (CRITICAL)

The `AuditSubscriber` **automatically** logs CREATE/UPDATE/DELETE for these entities:
`Company, Establishment, EmissionPoint, Warehouse, User, UserCompany, Role, BusinessRule, Tax, Contact, SystemSetting`

**For new entities/modules:**

1. **Add the entity to `ALLOWED_ENTITIES`** in `audit.subscriber.ts`:
```typescript
// In audit.subscriber.ts
import { YourNewEntity } from '../your-module/entities/your-new.entity';

const ALLOWED_ENTITIES = [
  // ...existing entities...
  YourNewEntity,   // ← ADD THIS
];
```

2. **Verify `companyId` is extractable** from your entity (via `getCompanyIdFromEntry`). If your entity doesn't have a direct `companyId` column, add a relation or column so the subscriber can resolve it.

3. **For actions NOT covered by TypeORM subscriber** (e.g., bulk operations, external integrations), use manual audit insertion:
```typescript
// Inject AuditLogsService and call manually
await this.auditLogsService.create({
  entity_name: 'Order',
  entity_id: orderId,
  company_id: companyId,
  action: AuditAction.UPDATE,
  performed_by: currentUserId, // from JWT payload
  old_values: beforeSnapshot,
  new_values: afterSnapshot,
});
```

**NEVER create a module that mutates data without audit coverage.**

---

### 2.4 Entity Design

```typescript
// ✅ Standard entity template
@Entity('your_entities')
@Unique('UQ_your_entities_company_field', ['companyId', 'uniqueField'])
export class YourEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
```

Rules:
- Always include `companyId` on multi-tenant entities
- Always include `isActive` for soft-delete pattern
- Use `snake_case` for column names in DB, `camelCase` for TS properties
- Always add `@Unique` constraints for business-unique fields per company
- Use `uuid` for all primary keys

---

### 2.5 Migrations

**ALWAYS create a migration for schema changes. Never use `synchronize: true` in production.**

```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/YourDescription

# Run migrations
npm run migration:run
```

Migration file naming: `{timestamp}-{PascalCaseDescription}.ts`
Example: `1743200000000-AddOrdersTable.ts`

Always add compound indexes for frequent query patterns:
```typescript
await queryRunner.query(`
  CREATE INDEX IF NOT EXISTS "IDX_orders_company_status"
  ON "orders" ("company_id", "status")
`);
```

---

### 2.6 DTOs and Validation

```typescript
// ✅ Always use class-validator decorators
export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;

  @IsUUID()
  @IsNotEmpty()
  contactId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;
}
```

**Never** validate inside the service what can be validated with class-validator in the DTO.

---

### 2.7 Resource Limits

Before creating any resource, check plan limits:
```typescript
await this.companiesService.assertResourceLimit(
  companyId,
  'max_inventory_items', // limit key from subscription plan
  'artículos',           // human-readable name for error message
);
```

---

### 2.8 Stock Business Rules

Before decrementing stock in any order/sale operation:
```typescript
await this.businessRulesService.validateStockBeforeDecrement(
  companyId,
  variant.stockActual,
  requestedQuantity,
);
```

---

## 3. FRONTEND RULES (Next.js 15 / React 18)

### 3.1 The Two API Modules — NEVER Mix Them

| Module | Where to use | Description |
|---|---|---|
| `lib/api.ts` | **Server Components, layouts, `page.tsx` (async)** | Direct fetch to backend with cookie forwarding. `cache: 'no-store'` |
| `lib/api-client.ts` | **Client Components (`"use client"`)** | Fetch via `/api` proxy. Includes 401→refresh interceptor |

```typescript
// ✅ CORRECT — Server Component (page.tsx, layout.tsx)
import { getArticles } from "@/lib/api"; // lib/api.ts
export default async function InventoryPage({ params }) {
  const articles = await getArticles(id);
  return <ArticlesTable articles={articles} />;
}

// ✅ CORRECT — Client Component
"use client";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api-client";
export function ContactList({ companyId }) {
  const [data, setData] = useState([]);
  useEffect(() => {
    apiGet(`/contacts/company/${companyId}`).then(setData);
  }, [companyId]);
}

// ❌ WRONG — Never import api.ts in a Client Component
"use client";
import { getArticles } from "@/lib/api"; // ← FORBIDDEN in "use client"

// ❌ WRONG — Never call backend directly from browser
fetch("http://localhost:3001/articles"); // ← FORBIDDEN — use /api proxy
```

---

### 3.2 Forms — react-hook-form + zod (MANDATORY)

**NEVER use raw `useState` to manage form fields.** Every form must use `react-hook-form`.

**Step 1: Define zod schema in `lib/validations/`**
```typescript
// lib/validations/order.schema.ts
import { z } from "zod";

export const createOrderSchema = z.object({
  contactId: z.string().uuid("Selecciona un cliente válido"),
  warehouseId: z.string().uuid("Selecciona un almacén"),
  items: z.array(z.object({
    variantId: z.string().uuid(),
    quantity: z.number().min(1, "Cantidad mínima: 1"),
    unitPrice: z.string().refine(v => parseFloat(v) > 0, "Precio inválido"),
  })).min(1, "Agrega al menos un producto"),
  observations: z.string().max(500).optional(),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
```

**Step 2: Create custom hook in `lib/hooks/`**
```typescript
// lib/hooks/useOrderForm.ts
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createOrderSchema, CreateOrderFormValues } from "@/lib/validations/order.schema";
import { apiPost } from "@/lib/api-client";
import { useToast } from "@/components/ui/use-toast";

export function useOrderForm(companyId: string, onSuccess?: () => void) {
  const { toast } = useToast();
  const form = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: { contactId: "", warehouseId: "", items: [], observations: "" },
  });

  async function onSubmit(values: CreateOrderFormValues) {
    try {
      await apiPost(`/orders/company/${companyId}`, values);
      toast({ title: "Éxito", description: "Pedido creado correctamente." });
      form.reset();
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar.",
        variant: "destructive",
      });
    }
  }

  return { form, onSubmit: form.handleSubmit(onSubmit), isSubmitting: form.formState.isSubmitting };
}
```

**Step 3: Build modular UI**
```typescript
// components/orders/OrderFormDialog.tsx
"use client";
import { FormProvider } from "react-hook-form";
import { useOrderForm } from "@/lib/hooks/useOrderForm";
import { OrderContactField } from "./OrderContactField";
import { OrderItemsPanel } from "./OrderItemsPanel";

export function OrderFormDialog({ companyId, onSuccess }: Props) {
  const { form, onSubmit, isSubmitting } = useOrderForm(companyId, onSuccess);

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <OrderContactField />      {/* uses useFormContext() internally */}
        <OrderItemsPanel />        {/* uses useFormContext() internally */}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Crear Pedido"}
        </Button>
      </form>
    </FormProvider>
  );
}
```

---

### 3.3 Component Size and Splitting

**Hard limits:**
- Component file: **300 lines max**
- Hook file: **200 lines max**
- No more than **4 props** passed down directly — use `FormProvider` / context for more

**Splitting strategy:**
```
OrderFormDialog.tsx          ← orchestrator (<100 lines)
├── OrderContactField.tsx    ← uses useFormContext()
├── OrderWarehouseField.tsx  ← uses useFormContext()
├── OrderItemsPanel.tsx      ← complex sub-form
│   ├── OrderItemRow.tsx
│   └── OrderItemSearch.tsx
└── useOrderForm.ts          ← all state + submit logic
```

---

### 3.4 Types — Centralized

**NEVER** define an interface or type inline in a component. All types go in `lib/types/`.

```typescript
// lib/types/order.types.ts
export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'cancelled';

export type OrderItem = {
  id: string;
  variantId: string;
  sku: string;
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
};

export type Order = {
  id: string;
  companyId: string;
  status: OrderStatus;
  items: OrderItem[];
  // ...
};
```

---

### 3.5 Mathematical Calculations

**ALL price, cost, and IVA calculations MUST use the established utilities. Never implement custom rounding.**

```typescript
// ✅ CORRECT — always use these
import { roundToFive } from "@/lib/math.util";
import { costToCostIncIva, costIncIvaToCost, formatDecimal } from "@/lib/cost-iva";

// For price display
const displayPrice = formatDecimal(roundToFive(price, 5));

// For IVA conversion
const costWithIva = costToCostIncIva(cost, ivaPct);  // cost → cost+IVA
const costWithout = costIncIvaToCost(costWithIva, ivaPct);  // cost+IVA → cost

// ❌ WRONG — never do custom rounding
const price = Math.round(value * 100) / 100;  // FORBIDDEN
const price = parseFloat(value.toFixed(2));    // FORBIDDEN
```

---

### 3.6 Styling — Acontplus Brand Tokens

```typescript
// ✅ Primary actions, main buttons, key borders
className="bg-acont-primary text-white hover:bg-acont-primary/90"
className="text-acont-primary border-acont-primary"
// → maps to #D61672 (Magenta)

// ✅ Warnings, alerts, secondary highlights
className="text-amber-500 bg-amber-50 border-amber-200"
// → maps to #FFA901 (Amber)

// ✅ Background surfaces
className="bg-acont-surface"  // card backgrounds

// ✅ Standard typography hierarchy
className="font-acont text-2xl font-bold tracking-tight text-slate-900"  // page titles
className="text-slate-600 text-sm"                                         // descriptions
className="text-slate-500 text-xs"                                         // captions

// ✅ Responsive grid (ALWAYS mobile-first)
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
className="grid grid-cols-1 md:grid-cols-3 gap-6"

// ❌ WRONG — never use raw hex colors
className="text-[#D61672]"   // Use tokens instead
style={{ color: '#D61672' }} // Forbidden
```

---

### 3.7 Error Handling in Client Components

```typescript
// ✅ Standard pattern for all async operations in components
async function handleAction() {
  setLoading(true);
  try {
    await apiPost('/endpoint', payload);
    toast({ title: "Éxito", description: "Operación completada." });
    onSuccess?.();
  } catch (err) {
    toast({
      title: "Error",
      description: err instanceof Error ? err.message : "No se pudo completar la operación.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}
```

**Never** swallow errors silently. Every `catch` must show user feedback via `toast`.

---

### 3.8 Loading and Empty States

Every data-driven component must handle:
```typescript
if (loading) return <div className="p-6 text-center text-slate-500">Cargando...</div>;
if (!data.length) return (
  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-6 text-center">
    <p className="text-slate-500 text-sm">No hay registros disponibles.</p>
  </div>
);
```

---

## 4. EXECUTION WORKFLOW — New Feature or Form

Follow this sequence **exactly** when building anything new:

### Step 1 — Types and Schema (Backend DTO + Frontend Zod)
```
Backend:  apps/backend/src/{module}/dto/create-{module}.dto.ts
Frontend: apps/web/lib/validations/{module}.schema.ts
          apps/web/lib/types/{module}.types.ts
```

### Step 2 — Backend Service + Controller
```
1. Create entity in apps/backend/src/{module}/entities/
2. Write service with QueryRunner for multi-writes
3. Add entity to AuditSubscriber's ALLOWED_ENTITIES
4. Write controller with proper guards (@RequirePermission or @AdminGuard)
5. Register module in AppModule
6. Generate + run migration
```

### Step 3 — Custom Hook
```
apps/web/lib/hooks/use{Feature}.ts
- Form state with useForm + zodResolver
- API calls using api-client.ts
- Success/error toast handling
- Return { form, onSubmit, isSubmitting, ...otherState }
```

### Step 4 — UI Components
```
apps/web/components/{module}/
├── {Feature}Dialog.tsx      ← or Page if it's a full page
├── {Feature}Form.tsx        ← uses FormProvider + useFormContext
├── {Feature}Table.tsx       ← displays list
└── {Feature}Row.tsx         ← individual row with actions
```

### Step 5 — Wire to Page
```
apps/web/app/dashboard/[id]/{module}/page.tsx
- Server Component: fetch initial data with lib/api.ts
- Render Client Components with data as props
```

---

## 5. ANTI-PATTERNS — Never Do These

### Backend Anti-Patterns
```typescript
// ❌ Business logic in controller
@Post() create(@Body() dto) {
  const item = new Article(); // ← FORBIDDEN in controller
  item.name = dto.name;
  return this.repo.save(item);
}

// ❌ Multiple writes without transaction
async create(dto) {
  const order = await this.orderRepo.save(dto);      // write 1
  await this.itemRepo.save({ orderId: order.id });   // write 2 — NO TRANSACTION = DATA CORRUPTION RISK
}

// ❌ Mutation endpoint without guards
@Post()
// missing @UseGuards entirely ← SECURITY VULNERABILITY
create(@Body() dto) { ... }

// ❌ New entity not in AuditSubscriber
// Created entity that writes to DB but was not added to ALLOWED_ENTITIES ← NO AUDIT TRAIL

// ❌ synchronize: true in TypeORM config (destroys production DB)
TypeOrmModule.forRoot({ synchronize: true }) // ← FORBIDDEN in production
```

### Frontend Anti-Patterns
```typescript
// ❌ Raw useState for forms
const [name, setName] = useState('');
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');
// ... 10 more fields ← USE react-hook-form

// ❌ Direct backend call from browser
fetch('http://localhost:3001/api/orders') // ← use /api proxy

// ❌ api.ts in Client Component
"use client";
import { getArticles } from "@/lib/api"; // ← FORBIDDEN — only for RSC

// ❌ Custom rounding
Math.round(price * 100) / 100 // ← use roundToFive from math.util.ts

// ❌ Inline type definitions
function Component({ data }: { items: { id: string; name: string }[] }) // ← define in lib/types/

// ❌ Monolithic component
// OrderPage.tsx with 800 lines of JSX ← split into sub-components

// ❌ More than 4 props without FormProvider
<SubForm field1={} field2={} field3={} field4={} field5={} handler1={} handler2={} />
// ← use FormProvider + useFormContext()

// ❌ Raw hex colors
style={{ color: '#D61672' }} // ← use className="text-acont-primary"
```

---

## 6. QUICK REFERENCE — Guard Combinations

| Scenario | Guard Setup |
|---|---|
| Read endpoint, any authenticated user | `@UseGuards(JwtAuthGuard, ModuleEnabledGuard)` |
| Mutation, role-based permission | `@UseGuards(JwtAuthGuard, ModuleEnabledGuard)` on class + `@UseGuards(RoleGuard) @RequirePermission('module', 'action')` on method |
| Mutation, admin-only | `@UseGuards(JwtAuthGuard, ModuleEnabledGuard)` on class + `@UseGuards(AdminGuard)` on method |
| Public endpoint (login, register) | `@Public()` decorator |
| Super admin bypass | Handled automatically in all guards — no special code needed |

---

## 7. DATABASE CONVENTIONS

- **Table names:** `snake_case`, plural (e.g., `order_items`, `article_variants`)
- **Column names:** `snake_case` in DB, `camelCase` in TS entity via `@Column({ name: 'snake_case' })`
- **Primary keys:** Always UUID (`@PrimaryGeneratedColumn('uuid')`)
- **Foreign keys:** `{entity}_id` pattern (e.g., `company_id`, `order_id`)
- **Soft delete:** Use `is_active: boolean` column + filter in queries (`WHERE is_active = true`)
- **Timestamps:** Always include `created_at` + `updated_at` via `@CreateDateColumn` / `@UpdateDateColumn`
- **Indexes:** Add compound index for every `(company_id, {frequently_queried_field})` combination
- **RLS:** All new tables in Supabase `public` schema must have RLS enabled (add to migration)

---

## 8. RESPONSES AND ERROR MESSAGES

All backend error responses must use Spanish and be user-facing friendly:
```typescript
throw new NotFoundException('Pedido no encontrado');
throw new ConflictException('Ya existe un pedido con este número en la empresa');
throw new BadRequestException('El cliente es obligatorio para crear un pedido');
throw new ForbiddenException('No tienes permiso para anular pedidos');
```

The `HttpExceptionFilter` (registered globally) ensures consistent JSON: `{ message: "..." }`.

---

---

## 9. REFACTORING & FORM IMPROVEMENTS — Rules When Touching Existing Code

> These rules apply **every time** Cursor is asked to refactor a component, improve a form,
> migrate state to react-hook-form, split a large file, or "clean up" existing code.
> They are an extension of all rules in sections 1–8 and are equally non-negotiable.

### 9.1 The Prime Directive — Do Not Break What Works

Before touching any existing file, answer these questions:

- [ ] Does this file have passing E2E or unit tests? → Run them before AND after
- [ ] Is this component rendered in a critical user flow (auth, inventory, checkout)? → Extra caution
- [ ] Does this service method touch the database? → Verify QueryRunner coverage survives the refactor
- [ ] Does the entity touched by this code appear in `AuditSubscriber.ALLOWED_ENTITIES`? → Audit must keep working after refactor
- [ ] Does this form currently save data to the backend correctly? → The refactor must not change the submitted payload shape unless the DTO changes too

**If any answer reveals a risk, write a regression test FIRST, then refactor.**

---

### 9.2 Form Migration — useState → react-hook-form

When migrating an existing form that uses raw `useState` to `react-hook-form + zod`,
follow this exact sequence. **Never skip steps.**

#### Step 1 — Audit the existing form first
Before writing a single line of the new form, document:
- Every `useState` field and its type
- Every validation currently done manually (`if (!name)`, `trim()` checks, etc.)
- The exact shape of the payload sent to the API on submit
- Any async checks done mid-form (e.g., barcode availability, SKU uniqueness)

#### Step 2 — Create or update the zod schema FIRST
```typescript
// lib/validations/{module}.schema.ts
// The schema must reproduce ALL existing validations — nothing is dropped silently
export const existingFormSchema = z.object({
  // Mirror every field that was in useState
  // Mirror every manual validation as a z.refine() or z.superRefine()
});
```

#### Step 3 — Verify the submit payload is identical
The object passed to `apiPost` / `apiPatch` after the migration must have
**exactly the same shape** as before. If the backend DTO changes, update the DTO,
migration, and zod schema in the same commit.
```typescript
// ✅ Before refactor (useState form)
await apiPost(`/contacts/company/${companyId}`, {
  name, taxId, email, isClient, isSupplier
});

// ✅ After refactor (RHF form) — payload shape must be identical
const onSubmit = form.handleSubmit(async (values) => {
  await apiPost(`/contacts/company/${companyId}`, {
    name: values.name,
    taxId: values.taxId,
    email: values.email,
    isClient: values.isClient,
    isSupplier: values.isSupplier,
    // NO extra fields, NO missing fields
  });
});
```

#### Step 4 — Preserve all async validation side-effects
If the old form had async checks (barcode availability, RUC uniqueness, etc.),
these must be preserved either as:
- `z.refine()` with an async resolver, or
- A dedicated `onBlur` handler calling the API check, or
- A validation step inside `handleSubmit` before the main API call

**Never silently remove an async validation during a form migration.**

#### Step 5 — Split the component if it exceeds 300 lines
If the form component will exceed 300 lines after migration:
```
{Feature}Dialog.tsx          ← orchestrator, FormProvider, submit handler
├── {Feature}GeneralFields.tsx    ← uses useFormContext()
├── {Feature}AdditionalFields.tsx ← uses useFormContext()
└── use{Feature}Form.ts           ← form init, defaultValues, onSubmit logic
```

---

### 9.3 Component Splitting Rules

When breaking a large component (>300 lines) into sub-components:

**Keep in the parent:**
- `FormProvider` / `useForm` initialization
- The `<form onSubmit={...}>` wrapper
- Dialog/modal open state
- The final submit button

**Move to child components:**
- Logical field groups (each tab, each section, each repeating row)
- Complex UI sub-sections (price tables, barcode lists, variant panels)
- Each child accesses form state via `useFormContext()` — never via props

**Move to a custom hook (`lib/hooks/use{Feature}.ts`):**
- `useForm` initialization and `defaultValues`
- `handleSubmit` + API call + toast logic
- All derived state computed from form values
- Any `useEffect` that watches form fields
```typescript
// ✅ CORRECT split
// Parent: just wires things together
export function ArticleFormDialog({ companyId, onSuccess }) {
  const { form, onSubmit, isSubmitting } = useArticleForm(companyId, onSuccess);
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <ArticleGeneralTab />
        <ArticleVariantsTab companyId={companyId} />
        <Button type="submit" disabled={isSubmitting}>Guardar</Button>
      </form>
    </FormProvider>
  );
}

// Child: reads its own fields via useFormContext
export function ArticleGeneralTab() {
  const { register, formState: { errors } } = useFormContext<ArticleFormValues>();
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FormField name="code" label="Código" />
      <FormField name="name" label="Nombre" />
      {/* ... */}
    </div>
  );
}
```

---

### 9.4 Service Refactoring Rules (Backend)

When splitting a large service (e.g., `articles.service.ts`) into sub-services:

**Never change the public method signatures** of the original service during the split.
The controller must still call the same methods with the same parameters.
```typescript
// ✅ CORRECT — ArticlesService becomes a facade after splitting
@Injectable()
export class ArticlesService {
  constructor(
    private readonly variantsService: ArticleVariantsService,   // extracted
    private readonly pricingService: ArticlePricingService,     // extracted
    private readonly imagesService: ArticleImagesService,       // extracted
  ) {}

  // Public interface unchanged — controller still works without modification
  async create(companyId: string, dto: CreateArticleDto): Promise<Article> {
    return this.variantsService.createWithArticle(companyId, dto);
  }
}
```

**QueryRunner must survive the split.** If a transaction spans multiple sub-services,
pass the `QueryRunner` (or `EntityManager`) as a parameter:
```typescript
// ✅ CORRECT — pass the queryRunner down
async createVariant(
  articleId: string,
  dto: CreateVariantDto,
  qr: QueryRunner,           // receives the active transaction
): Promise<ArticleVariant> {
  return qr.manager.save(ArticleVariant, { articleId, ...dto });
}
```

**Never** create a new `QueryRunner` inside a sub-service when the caller
already has an active transaction. This would create a separate, non-atomic transaction.

---

### 9.5 What Must NOT Change During a Refactor

The following must remain 100% identical before and after any refactor:

| What | Why |
|---|---|
| API endpoint paths and HTTP methods | Frontend and any integrations depend on them |
| DTO field names and types | Changing breaks validation and frontend payload |
| Entity column names in the database | Requires a migration if changed — never silently |
| AuditSubscriber ALLOWED_ENTITIES list | Dropping an entity removes its audit trail |
| Guard order on controllers | `JwtAuthGuard → ModuleEnabledGuard → RoleGuard` order is load-bearing |
| Cookie name `token` | Used in middleware, proxy, and JwtStrategy |
| Error message format `{ message: string }` | Frontend parses this shape everywhere |

---

### 9.6 Incremental Refactor Policy — The 20% Rule

Cursor must NOT refactor a module that is not being actively modified for a feature.
Refactoring happens **only when a file is already being touched** for a real requirement.
```
✅ "Add barcode validation to article form" → allowed to also split the component
✅ "Fix IVA calculation bug in ArticlesService" → allowed to also extract ArticlePricingService
✅ "Add new field to contact form" → allowed to also migrate form to react-hook-form

❌ "Refactor all forms to react-hook-form" → not a valid standalone task
❌ "Split ArticlesService into sub-services" → not valid without a feature trigger
❌ "Rewrite ContactList component" → not valid if it currently works
```

The only exception: explicit security fixes (P0 issues from the audit) which are always
valid as standalone tasks regardless of whether the file has a feature change.

---

### 9.7 Regression Verification Checklist (Run After Every Refactor)

After completing any refactor, verify manually or via tests:

**Backend:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run test` — no previously passing unit tests now fail
- [ ] The refactored endpoint responds correctly to a real HTTP request
- [ ] Audit logs are still generated for mutations on the affected entity
- [ ] If a transaction was involved, test the rollback path (force an error on the second write)

**Frontend:**
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] The form submits successfully and the network request payload is unchanged
- [ ] Validation errors display correctly on invalid input
- [ ] Loading state (`isSubmitting`) disables the submit button during the request
- [ ] Toast notifications appear on both success and error paths
- [ ] The component renders correctly on mobile (grid collapses to single column)
- [ ] No `console.error` in browser DevTools after the refactor



---

## 10. MOBILE COMPATIBILITY — Flutter App (Hybrid Offline Mode)

> The backend API must be designed to support a Flutter mobile client
> simultaneously with the Next.js web client. Flutter is a fully independent
> app (no shared code with apps/web), but it consumes the SAME NestJS API.
> Every backend decision must consider both clients. These rules are
> non-negotiable when building or modifying any module that the mobile
> app will consume: POS/billing, inventory, barcode scanning, contacts,
> orders, and reports.

---

### 10.1 API Design — Mobile-First Contracts

#### 10.1.1 Every endpoint must return explicit, typed, complete responses
Flutter's type system is strict. Never return partial objects, `undefined`
fields, or shapes that vary between create and update responses.
```typescript
// ❌ WRONG — inconsistent shape between operations
// POST returns full entity, PATCH returns only { message: 'updated' }
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
  await this.ordersService.update(id, dto);
  return { message: 'Pedido actualizado' }; // Flutter can't deserialize this
}

// ✅ CORRECT — always return the full updated entity
@Patch(':id')
async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
  return this.ordersService.update(id, dto); // returns full Order object
}
```

**Rule:** Every `POST` returns the created entity with its generated `id`.
Every `PATCH` returns the full updated entity. Every `DELETE` returns
`{ success: true, id: string }` — never an empty 204.
```typescript
// ✅ DELETE response shape for Flutter
@Delete(':id')
async remove(@Param('id') id: string) {
  await this.service.remove(id);
  return { success: true, id }; // Flutter confirms which record was deleted
}
```

---

#### 10.1.2 Paginated endpoints — mandatory standard shape
Flutter lists use infinite scroll or pagination. Every list endpoint that
can return more than 50 records MUST use this exact paginated shape:
```typescript
// ✅ Standard paginated response — never deviate from this shape
{
  data: T[];          // the records array
  total: number;      // total count in DB (for pagination UI)
  page: number;       // current page (1-based)
  limit: number;      // page size used
  totalPages: number; // Math.ceil(total / limit)
}

// ✅ Service implementation
async findAllByCompany(
  companyId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Order>> {
  const [data, total] = await this.orderRepo.findAndCount({
    where: { companyId },
    order: { created_at: 'DESC' },
    skip: (page - 1) * limit,
    take: Math.min(limit, 100), // cap at 100 to protect the API
  });
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ✅ Controller
@Get('company/:companyId')
findAll(
  @Param('companyId') companyId: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));
  return this.service.findAllByCompany(companyId, pageNum, limitNum);
}
```

**Never** use `limit=500` hardcoded in any endpoint. Mobile connections
are slower — large payloads kill performance and battery.

---

#### 10.1.3 Filtering and search — query params, never body
Flutter HTTP clients send filters as query parameters on GET requests.
Never require a JSON body for a read/search operation.
```typescript
// ✅ CORRECT — filters as query params
GET /orders/company/:companyId?status=confirmed&from=2024-01-01&to=2024-12-31&page=1&limit=20

// ❌ WRONG — body on GET (breaks Flutter's http package and REST conventions)
GET /orders/search
Body: { status: 'confirmed', dateRange: { from, to } }
```

---

#### 10.1.4 Barcode lookup endpoint — required for scanner
The Flutter barcode scanner needs a fast, single-purpose lookup endpoint:
```typescript
// ✅ Required endpoint for barcode scanner feature
// GET /articles/company/:companyId/barcode/:barcode
@Get('company/:companyId/barcode/:barcode')
@UseGuards(JwtAuthGuard)
async findByBarcode(
  @Param('companyId') companyId: string,
  @Param('barcode') barcode: string,
) {
  return this.articlesService.findByBarcode(companyId, barcode.trim());
}
// Returns: full ArticleVariant with article, prices, current stock
// Returns 404 with { message: 'Código de barras no encontrado' } if not found
```

---

### 10.2 Authentication — Mobile Token Strategy

Flutter cannot use HttpOnly cookies (they are browser-only).
The API must support **Bearer token authentication in the Authorization header**
as an alternative to cookie-based auth, for the same endpoints.
```typescript
// ✅ JwtStrategy already supports both — verify this is maintained
// In jwt.strategy.ts, the extractor must check BOTH sources:
import { ExtractJwt } from 'passport-jwt';

// Extract from Authorization header (Flutter) OR cookie (Next.js web)
jwtFromRequest: ExtractJwt.fromExtractors([
  ExtractJwt.fromAuthHeaderAsBearerToken(),  // Flutter uses this
  (req) => req?.cookies?.token ?? null,       // Next.js web uses this
]),
```

**Token refresh for Flutter:** The mobile app must be able to refresh its
token using the Authorization header (not a cookie). The `/auth/refresh`
endpoint must accept the expired token in the `Authorization: Bearer` header,
not just from a cookie.

**Never remove cookie support** — the web app depends on it. Both
extraction methods must coexist permanently.

---

### 10.3 Offline Sync — Backend Requirements

The Flutter app works in hybrid offline mode: it queues operations locally
(SQLite via Drift) and syncs when connectivity is restored. The backend
must support this pattern.

#### 10.3.1 Idempotency — required on all mutation endpoints
The mobile app may retry a request if it doesn't receive a response
(network timeout mid-request). The server must not create duplicate records.
```typescript
// ✅ Accept an optional client-generated idempotency key
// In CreateOrderDto:
@IsOptional()
@IsUUID()
clientRequestId?: string; // UUID generated by Flutter before sending

// ✅ In the service, use upsert-on-clientRequestId:
async create(companyId: string, dto: CreateOrderDto): Promise<Order> {
  // If clientRequestId exists, check if already processed
  if (dto.clientRequestId) {
    const existing = await this.orderRepo.findOne({
      where: { clientRequestId: dto.clientRequestId, companyId },
    });
    if (existing) return existing; // idempotent — return the already-created record
  }
  // ... rest of creation logic with QueryRunner
}
```

#### 10.3.2 Timestamps for delta sync
Every entity that the mobile app syncs must expose `updated_at` so Flutter
can request only records changed since its last sync:
```typescript
// ✅ Every syncable entity already has @UpdateDateColumn — maintain this always
@UpdateDateColumn({ name: 'updated_at' })
updated_at: Date;

// ✅ Every list endpoint must support delta sync via updatedSince param:
// GET /articles/company/:companyId?updatedSince=2024-01-15T10:30:00Z&page=1&limit=100
@Get('company/:companyId')
findAll(
  @Param('companyId') companyId: string,
  @Query('updatedSince') updatedSince?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  return this.service.findAllByCompany(companyId, {
    updatedSince: updatedSince ? new Date(updatedSince) : undefined,
    page: parseInt(page || '1'),
    limit: Math.min(100, parseInt(limit || '50')),
  });
}
```

#### 10.3.3 Conflict resolution — last-write-wins with server timestamp
When the mobile app syncs an offline-created record, the server timestamp wins.
Never allow the client to set `created_at` or `updated_at` directly:
```typescript
// ✅ Strip client-sent timestamps in DTOs
export class CreateOrderDto {
  // ... valid fields ...

  // ❌ Never accept these from the client
  // created_at is NOT in the DTO — TypeORM sets it via @CreateDateColumn
  // updated_at is NOT in the DTO — TypeORM sets it via @UpdateDateColumn
}
```

---

### 10.4 Response Consistency — Field Naming

Flutter's `json_serializable` code generator maps JSON to Dart models.
Inconsistent field naming breaks the generated code silently.

**Rule: All JSON responses must use `snake_case` field names consistently.**
```typescript
// ✅ CORRECT — snake_case in JSON output (TypeORM entities with @Column({ name }) already do this)
{
  "id": "uuid",
  "company_id": "uuid",
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}

// ❌ WRONG — mixed naming breaks Flutter deserialization
{
  "id": "uuid",
  "companyId": "uuid",    // camelCase mixed in
  "isActive": true,       // Flutter model expects is_active
  "createdAt": "..."      // Flutter model expects created_at
}
```

To enforce this globally in NestJS, add a serialization interceptor:
```typescript
// In main.ts — add after app creation
import { ClassSerializerInterceptor } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

// In AppModule providers:
{
  provide: APP_INTERCEPTOR,
  useClass: ClassSerializerInterceptor,
}
```

And add `@Transform` decorators for any field that needs explicit naming.

---

### 10.5 Error Response Shape — Consistent for Flutter

Flutter error handling deserializes the error body. The shape must be
100% consistent across all endpoints — no exceptions.
```typescript
// ✅ All errors from HttpExceptionFilter already follow this shape — MAINTAIN IT:
{
  "message": "string — human readable, in Spanish, shown directly to user"
}

// ❌ NEVER return these shapes from any endpoint:
{ "error": "Not Found", "statusCode": 404 }     // NestJS default — overridden by filter
{ "errors": ["field is required"] }              // validation array — flatten to message
{}                                                // empty error body
```

The `HttpExceptionFilter` already handles this globally. Never bypass it
by catching errors in the controller and returning a custom shape.

---

### 10.6 Endpoints Required by POS Module (Mobile)

When building the POS/billing module, these endpoints are mandatory for
the Flutter client to function. Design them before building the UI:
```
POST   /orders/company/:companyId              → Create order (with clientRequestId)
GET    /orders/company/:companyId              → List orders (paginated + updatedSince)
GET    /orders/:id                             → Single order with full detail
PATCH  /orders/:id/confirm                     → Confirm/close order
PATCH  /orders/:id/cancel                      → Cancel order
POST   /orders/:id/payments                    → Register payment for order

GET    /articles/company/:companyId/barcode/:barcode  → Barcode scanner lookup
GET    /articles/company/:companyId            → Article list (paginated + updatedSince)

GET    /contacts/company/:companyId?type=client → Client list for POS selector
GET    /contacts/company/:companyId/search?q=  → Quick search by name or taxId

GET    /reports/company/:companyId/sales-summary?from=&to=  → Dashboard data
```

Every one of these must:
- Require `JwtAuthGuard` + appropriate `ModuleEnabledGuard`
- Return consistent paginated shape (10.1.2) where applicable
- Support `updatedSince` for delta sync (10.3.2)
- Accept Bearer token in Authorization header (10.2)

---

### 10.7 What NEVER Changes Once Mobile Is Live

Once the Flutter app is published to the App Store / Play Store,
**breaking API changes require a new app version**. Users don't update
immediately. The API must maintain backward compatibility.

| Change type | Policy |
|---|---|
| Renaming a JSON field | **FORBIDDEN** — add new field alongside old one, deprecate old after 2 versions |
| Removing an endpoint | **FORBIDDEN** — return 410 Gone with migration message |
| Changing a field from optional to required | **FORBIDDEN** — add validation only for new records |
| Adding a new optional field to a response | ✅ Safe — Flutter ignores unknown fields |
| Adding a new optional query param | ✅ Safe — defaults handle missing params |
| Adding a new endpoint | ✅ Safe — existing clients ignore it |
| Changing HTTP status codes | **FORBIDDEN** — Flutter switch statements depend on them |
| Changing error message field from `message` to anything else | **FORBIDDEN** |


*These rules are derived from the actual codebase architecture audit of `acontplusgestionpedidos`. Apply them without exception on every code generation.*
