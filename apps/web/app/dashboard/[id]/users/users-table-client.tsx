"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserPlus, UserMinus } from "lucide-react";
import { UserDialog, type UserForDialog } from "./user-dialog";
import { AssignUserDialog } from "./assign-user-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type LimitInfo = {
  totalCount: number;
  totalLimit: number;
  sellersCount: number;
  sellersLimit: number;
};

const defaultLimitInfo: LimitInfo = {
  totalCount: 0,
  totalLimit: -1,
  sellersCount: 0,
  sellersLimit: -1,
};

export function UsersTableClient({
  users,
  companyId,
  limitInfo = defaultLimitInfo,
}: {
  users: UserRow[];
  companyId: string;
  limitInfo?: LimitInfo;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserForDialog | null>(null);
  const [removeTarget, setRemoveTarget] = useState<UserRow | null>(null);
  const [removing, setRemoving] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const refresh = () => router.refresh();
  const totalLimitReached =
    limitInfo.totalLimit >= 0 && limitInfo.totalCount >= limitInfo.totalLimit;

  function openNewDialog() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEditDialog(user: UserRow) {
    setEditingUser({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingUser(null);
  }

  async function handleRemoveFromCompany() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `${API_BASE}/users/company/${companyId}/user/${removeTarget.id}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al remover");
      setRemoveTarget(null);
      toast({
        title: "Éxito",
        description: "Usuario removido de la empresa.",
        variant: "default",
      });
      refresh();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "No se pudo remover.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Equipo</h1>
          <p className="text-slate-500">Gestiona quién tiene acceso a tu empresa.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-slate-300"
            onClick={() => setAssignDialogOpen(true)}
            disabled={totalLimitReached}
            title={totalLimitReached ? "Límite de plan alcanzado" : undefined}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Asignar usuario existente
          </Button>
          <Button
            className="bg-slate-900 hover:bg-slate-800 shadow-md"
            onClick={openNewDialog}
            disabled={totalLimitReached}
            title={totalLimitReached ? "Límite de plan alcanzado" : undefined}
          >
            + Nuevo Usuario
          </Button>
        </div>
      </div>

      <UserDialog
        companyId={companyId}
        initialData={editingUser}
        limitInfo={limitInfo}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
      />

      <AssignUserDialog
        companyId={companyId}
        limitInfo={limitInfo}
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSuccess={refresh}
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-[80px]">Avatar</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                  No hay usuarios registrados (algo anda mal si no te ves a ti mismo).
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.full_name}`}
                      />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell className="text-slate-500">{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === "owner"
                          ? "default"
                          : user.role === "admin"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {user.role === "owner" && "👑 Dueño"}
                      {user.role === "admin" && "💼 Admin"}
                      {user.role === "seller" && "🛒 Vendedor"}
                      {!["owner", "admin", "seller"].includes(user.role) &&
                        user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-900"
                        aria-label="Editar usuario"
                        onClick={() => openEditDialog(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        aria-label="Remover de empresa"
                        onClick={() => setRemoveTarget(user)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>¿Remover usuario de la empresa?</DialogTitle>
            <DialogDescription>
              {removeTarget
                ? `${removeTarget.full_name} (${removeTarget.email}) ya no tendrá acceso a esta empresa.`
                : ""}{" "}
              El usuario conservará su cuenta y el acceso a otras empresas donde
              esté asignado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveFromCompany}
              disabled={removing}
            >
              {removing ? "Removiendo..." : "Remover de empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
