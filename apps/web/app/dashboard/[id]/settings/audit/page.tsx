"use client";

import { useState, useEffect, use } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Eye } from "lucide-react";
import { DateFormatter } from "@/components/date-formatter";

// Usar /api para que pase por el proxy de Next.js (evita CORS, reenvía cookies, consistente con contact-list)
import { apiGet, getCategoriesClient } from "@/lib/api-client";

type AuditLogItem = {
  id: string;
  entity_name: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  performedByUser?: { id: string; full_name: string; email: string } | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
};

/** Catálogos para resolver UUIDs a nombres en el modal de detalle (solo en vista, no en tabla). */
export type AuditCatalogs = {
  roles?: Array<{ id: string; name: string }>;
  users?: Array<{ id: string; full_name: string }>;
  companies?: Array<{ id: string; name: string }>;
  warehouses?: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
};

/** Transforma old_values/new_values reemplazando UUIDs por nombres legibles. No hace fetch. */
function resolveAuditValues(
  values: Record<string, unknown> | null,
  catalogs: AuditCatalogs,
): Record<string, unknown> | null {
  if (!values) return null;
  const resolved: Record<string, unknown> = { ...values };

  if (catalogs.roles && typeof resolved.roleId === "string") {
    const role = catalogs.roles.find((r) => r.id === resolved.roleId);
    if (role) resolved.roleId = role.name;
  }
  if (catalogs.users && typeof resolved.userId === "string") {
    const user = catalogs.users.find((u) => u.id === resolved.userId);
    if (user) resolved.userId = user.full_name;
  }
  if (catalogs.companies && typeof resolved.companyId === "string") {
    const company = catalogs.companies.find((c) => c.id === resolved.companyId);
    if (company) resolved.companyId = company.name;
  }
  if (catalogs.warehouses && typeof resolved.warehouseId === "string") {
    const wh = catalogs.warehouses.find((w) => w.id === resolved.warehouseId);
    if (wh) resolved.warehouseId = wh.name;
  }
  if (catalogs.categories && typeof resolved.categoryId === "string") {
    const cat = catalogs.categories.find((c) => c.id === resolved.categoryId);
    if (cat) resolved.categoryId = cat.name;
  }
  return resolved;
}

const ENTITY_LABELS: Record<string, string> = {
  Company: "Empresa",
  User: "Usuario",
  UserCompany: "Asignación de Usuario",
  Role: "Rol",
  Establishment: "Establecimiento",
  Warehouse: "Almacén",
  EmissionPoint: "Punto de Emisión",
  Tax: "Impuesto",
  SystemSetting: "Configuración",
  BusinessRule: "Regla de Negocio",
  Article: "Artículo",
  ArticleVariant: "Variante de Artículo",
};

function resolveEntityLabel(
  entityName: string,
  values: Record<string, unknown> | null,
): string {
  if (ENTITY_LABELS[entityName]) {
    return ENTITY_LABELS[entityName];
  }
  if (entityName !== "Contact") return entityName;

  const isClient = values?.isClient === true;
  const isSupplier = values?.isSupplier === true;
  const isEmployee = values?.isEmployee === true;

  const types: string[] = [];
  if (isClient) types.push("Cliente");
  if (isSupplier) types.push("Proveedor");
  if (isEmployee) types.push("Empleado");

  if (types.length === 0) return "Contactos";
  return `Contactos › ${types.join(", ")}`;
}

function ActionBadge({ action }: { action: string }) {
  if (action === "CREATE")
    return <Badge variant="default">CREATE</Badge>;
  if (action === "UPDATE")
    return <Badge variant="secondary">UPDATE</Badge>;
  if (action === "DELETE")
    return <Badge variant="destructive">DELETE</Badge>;
  return <Badge variant="outline">{action}</Badge>;
}

function AuditDetailsDialog({
  log,
  open,
  onOpenChange,
  companyId,
  catalogs,
}: {
  log: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  catalogs: AuditCatalogs;
}) {
  const [entityLabel, setEntityLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !log) {
      setEntityLabel(null);
      return;
    }
    const currentLog = log;
    async function loadEntityLabel() {
      try {
        if (
          currentLog.entity_name === "Contact" &&
          currentLog.entity_id
        ) {
          const contact = await apiGet<{
            name: string;
            tradeName?: string | null;
          }>(`/contacts/${currentLog.entity_id}`);
          setEntityLabel(
            contact.tradeName
              ? `${contact.name} (${contact.tradeName})`
              : contact.name,
          );
        } else {
          setEntityLabel(null);
        }
      } catch {
        setEntityLabel(null);
      }
    }
    loadEntityLabel();
  }, [log, open]);

  if (!log) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Detalle del evento</DialogTitle>
          <DialogDescription>
            Valores anteriores y nuevos del registro.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 flex-1 min-h-0">
          <div className="text-sm text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-slate-700">
              {resolveEntityLabel(
                log.entity_name,
                log.new_values ?? log.old_values,
              )}
            </span>
            {entityLabel && (
              <>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-slate-800">
                  {entityLabel}
                </span>
              </>
            )}
            <span className="text-slate-300">·</span>
            <ActionBadge action={log.action} />
            <span className="text-slate-300">·</span>
            <DateFormatter
              dateString={log.created_at}
              companyId={companyId}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col min-h-0">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Antes
              </h4>
              <div className="flex-1 min-h-[120px] max-h-64 rounded border bg-slate-50 overflow-auto p-3">
                <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                  {log.old_values != null
                    ? JSON.stringify(
                        resolveAuditValues(log.old_values, catalogs),
                        null,
                        2,
                      )
                    : "—"}
                </pre>
              </div>
            </div>
            <div className="flex flex-col min-h-0">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Después
              </h4>
              <div className="flex-1 min-h-[120px] max-h-64 rounded border bg-slate-50 overflow-auto p-3">
                <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                  {log.new_values != null
                    ? JSON.stringify(
                        resolveAuditValues(log.new_values, catalogs),
                        null,
                        2,
                      )
                    : "—"}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AuditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [catalogs, setCatalogs] = useState<AuditCatalogs>({});
  const { toast } = useToast();

  // Catálogos para resolver UUIDs en el modal (una sola vez al montar/cambiar empresa)
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<Array<{ id: string; name: string }>>(
        `/roles?companyId=${encodeURIComponent(companyId)}`,
      ).catch(() => []),
      apiGet<{ data?: Array<{ id: string; full_name: string }>; total?: number }>(
        `/users/company/${companyId}?page=1&limit=500`,
      )
        .then((res) => (Array.isArray(res) ? res : res?.data ?? []))
        .catch(() => []),
      getCategoriesClient(companyId).catch(() => []),
      apiGet<{ id: string; name: string }>(`/companies/${companyId}`).catch(
        () => null,
      ),
    ]).then(([rolesData, usersData, categoriesData, companyInfo]) => {
      if (cancelled) return;
      const roles = Array.isArray(rolesData) ? rolesData : [];
      const users = Array.isArray(usersData) ? usersData : [];
      const categories = Array.isArray(categoriesData) ? categoriesData : [];
      const companies = companyInfo
        ? [{ id: companyId, name: companyInfo.name }]
        : [];
      setCatalogs({ roles, users, categories, companies });
    });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = `/api/audit-logs?companyId=${encodeURIComponent(companyId)}&page=${page}&limit=${limit}`;
    apiGet<{ data?: AuditLogItem[]; total?: number }>(url)
      .then((data) => {
        if (cancelled) return;
        if (Array.isArray(data.data)) {
          setLogs(data.data);
          setTotal(data.total ?? 0);
        } else {
          setLogs([]);
          setTotal(0);
        }
      })
      .catch((error) => {
        console.error("Frontend Fetch Error:", error);
        if (!cancelled) {
          setLogs([]);
          setTotal(0);
          toast({
            title: "Error",
            description: "No se pudieron cargar los registros de auditoría.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- toast es estable, excluirlo evita re-fetches infinitos
  }, [companyId, page]);

  const totalPages = Math.ceil(total / limit) || 1;

  function openDetails(log: AuditLogItem) {
    setSelectedLog(log);
    setDetailsOpen(true);
  }

  function displayUser(log: AuditLogItem): string {
    const u = log.performedByUser;
    if (u?.full_name) return u.full_name;
    if (u?.email) return u.email;
    if (log.performed_by) return log.performed_by;
    return "Sistema";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Auditoría del Sistema</h1>
        <p className="text-slate-500 text-sm mt-1">
          Historial de cambios en entidades del sistema. Use el botón Ver para inspeccionar valores anteriores y nuevos.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de eventos</CardTitle>
          <CardDescription>
            Fecha, usuario, entidad, acción y detalle de cambios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500 py-8 text-center">Cargando...</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead className="text-right">Detalles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                        No hay registros de auditoría.
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm text-slate-600">
                          <DateFormatter dateString={log.created_at} companyId={companyId} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {displayUser(log)}
                        </TableCell>
                        <TableCell>
                          {resolveEntityLabel(
                            log.entity_name,
                            log.new_values ?? log.old_values,
                          )}
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDetails(log)}
                            aria-label="Ver detalle"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-slate-500">
                    Página {page} de {totalPages} ({total} registros)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AuditDetailsDialog
        log={selectedLog}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        companyId={companyId}
        catalogs={catalogs}
      />
    </div>
  );
}
