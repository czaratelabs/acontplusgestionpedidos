"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { UserDialog, type UserForDialog } from "./user-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export function UsersTableClient({
  users,
  companyId,
}: {
  users: UserRow[];
  companyId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserForDialog | null>(null);

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

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Equipo</h1>
          <p className="text-slate-500">Gestiona quién tiene acceso a tu empresa.</p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800 shadow-md"
          onClick={openNewDialog}
        >
          + Nuevo Usuario
        </Button>
      </div>

      <UserDialog
        companyId={companyId}
        initialData={editingUser}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
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
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-slate-900"
                      aria-label="Editar usuario"
                      onClick={() => openEditDialog(user)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
