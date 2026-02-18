"use client";

import { useState } from "react";
import { Pencil, Ban, CheckCircle } from "lucide-react";
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
  const [inactivateTarget, setInactivateTarget] = useState<RoleRow | null>(null);
  const [inactivating, setInactivating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
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

  async function handleInactivate() {
    if (!inactivateTarget) return;
    setInactivating(true);
    try {
      const res = await fetch(`${API_BASE}/roles/${inactivateTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al inactivar");
      setInactivateTarget(null);
      onRefresh();
      toast({
        title: "Éxito",
        description: "Rol inactivado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo inactivar el rol.",
        variant: "destructive",
      });
    } finally {
      setInactivating(false);
    }
  }

  const systemRoles = ["owner", "admin", "seller"];
  const canInactivate = (role: RoleRow) =>
    role.isActive &&
    (role.companyId != null || !systemRoles.includes(role.name.toLowerCase()));
  const canActivate = (role: RoleRow) =>
    !role.isActive &&
    (role.companyId != null || !systemRoles.includes(role.name.toLowerCase()));

  function handleToggleStatus(role: RoleRow) {
    if (role.isActive) {
      setInactivateTarget(role);
    } else {
      handleActivate(role);
    }
  }

  async function handleActivate(role: RoleRow) {
    setActivatingId(role.id);
    try {
      const res = await fetch(`${API_BASE}/roles/${role.id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al activar");
      onRefresh();
      toast({
        title: "Éxito",
        description: "Rol activado correctamente.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo activar el rol.",
        variant: "destructive",
      });
    } finally {
      setActivatingId(null);
    }
  }

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
                    <Badge
                      className={
                        role.isActive
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }
                    >
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
                      {canInactivate(role) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(role)}
                          aria-label="Inactivar"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {canActivate(role) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(role)}
                          aria-label="Activar"
                          disabled={activatingId === role.id}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4" />
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

      <Dialog open={!!inactivateTarget} onOpenChange={() => setInactivateTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Inactivar rol?</DialogTitle>
            <DialogDescription>
              El rol pasará a estado inactivo y no podrá ser asignado a nuevos
              usuarios. Los usuarios actuales podrían perder acceso si se filtra
              por roles activos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInactivateTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="default"
              onClick={handleInactivate}
              disabled={inactivating}
            >
              {inactivating ? "Inactivando..." : "Inactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
