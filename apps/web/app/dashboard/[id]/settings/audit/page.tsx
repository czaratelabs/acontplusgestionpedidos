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
import { useCompanyTimezone } from "@/hooks/use-timezone";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  timeZone,
}: {
  log: AuditLogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeZone?: string;
}) {
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
          <div className="text-sm text-slate-500">
            {log.entity_name} · <ActionBadge action={log.action} /> ·{" "}
            <DateFormatter dateString={log.created_at} timeZone={timeZone} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col min-h-0">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Antes
              </h4>
              <div className="flex-1 min-h-[120px] max-h-64 rounded border bg-slate-50 overflow-auto p-3">
                <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                  {log.old_values != null
                    ? JSON.stringify(log.old_values, null, 2)
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
                    ? JSON.stringify(log.new_values, null, 2)
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
  const { toast } = useToast();
  const { timeZone } = useCompanyTimezone(companyId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = `${API_BASE}/audit-logs?companyId=${encodeURIComponent(companyId)}&page=${page}&limit=${limit}`;
    fetch(url, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          console.error("API Error Response:", text);
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
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
                          <DateFormatter dateString={log.created_at} timeZone={timeZone} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {displayUser(log)}
                        </TableCell>
                        <TableCell>{log.entity_name}</TableCell>
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
        timeZone={timeZone}
      />
    </div>
  );
}
