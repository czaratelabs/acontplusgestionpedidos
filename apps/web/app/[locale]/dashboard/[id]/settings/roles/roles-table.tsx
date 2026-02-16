"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { RoleDialog, type RoleForDialog } from "./role-dialog";
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

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  companyId: string | null;
};

type RolesTableClientProps = {
  roles: RoleRow[];
  companyId: string;
  onRefresh: () => void;
};

export function RolesTableClient({
  roles,
  companyId,
  onRefresh,
}: RolesTableClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleForDialog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  function openNewDialog() {
    setEditingRole(null);
    setDialogOpen(true);
  }

  function openEditDialog(role: RoleRow) {
    setEditingRole({
      id: role.id,
      name: role.name,
      description: role.description,
      isActive: role.isActive,
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingRole(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/roles/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al eliminar");
      setDeleteTarget(null);
      onRefresh();
      toast({
        title: "Éxito",
        description: "Rol eliminado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar el rol.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  const systemRoles = ["owner", "admin", "seller"];
  const canDelete = (role: RoleRow) =>
    role.companyId != null || !systemRoles.includes(role.name.toLowerCase());

  return (
    <>
      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800">Lista de roles</h2>
          <Button
            className="bg-slate-900 hover:bg-slate-800"
            onClick={openNewDialog}
          >
            + Nuevo Rol
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                  No hay roles configurados. Crea uno con el botón "Nuevo Rol".
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="text-slate-600 max-w-xs truncate">
                    {role.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.isActive ? "default" : "secondary"}>
                      {role.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(role)}
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete(role) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(role)}
                          aria-label="Eliminar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RoleDialog
        companyId={companyId}
        initialData={editingRole}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSuccess={onRefresh}
      />

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar rol?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Si el rol está asignado a usuarios,
              deberás reasignarlos a otro rol antes de poder eliminarlo.
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
