"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { TaxDialog, type TaxForDialog } from "./tax-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type TaxRow = {
  id: string;
  name: string;
  percentage: number;
  code: string | null;
  is_active: boolean;
};

type TaxesTableProps = {
  taxes: TaxRow[];
  companyId: string;
  onRefresh: () => void;
};

export function TaxesTable({
  taxes,
  companyId,
  onRefresh,
}: TaxesTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxForDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TaxRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  function openNewDialog() {
    setEditingTax(null);
    setDialogOpen(true);
  }

  function openEditDialog(tax: TaxRow) {
    setEditingTax({
      id: tax.id,
      name: tax.name,
      percentage: tax.percentage,
      code: tax.code,
      is_active: tax.is_active,
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingTax(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/taxes/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al eliminar");
      setDeleteTarget(null);
      onRefresh();
      toast({
        title: "Éxito",
        description: "Impuesto eliminado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el impuesto.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Lista de impuestos</h2>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            onClick={openNewDialog}
          >
            + Nuevo Impuesto
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Porcentaje</TableHead>
              <TableHead>Código SRI</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {taxes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  No hay impuestos configurados. Agrega uno con el botón "Nuevo Impuesto".
                </TableCell>
              </TableRow>
            ) : (
              taxes.map((tax) => (
                <TableRow key={tax.id}>
                  <TableCell className="font-medium">{tax.name}</TableCell>
                  <TableCell>{Number(tax.percentage).toFixed(2)}%</TableCell>
                  <TableCell className="text-slate-600">{tax.code || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={tax.is_active ? "default" : "secondary"}>
                      {tax.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Editar impuesto"
                        onClick={() => openEditDialog(tax)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        aria-label="Eliminar impuesto"
                        onClick={() => setDeleteTarget(tax)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TaxDialog
        companyId={companyId}
        initialData={editingTax}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSuccess={onRefresh}
      />

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar impuesto?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Se eliminará "${deleteTarget.name}". Esta acción no se puede deshacer.`
                : ""}{" "}
              Si el impuesto está asociado a facturas o productos, podría afectar los datos existentes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
