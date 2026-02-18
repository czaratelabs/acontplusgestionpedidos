"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ban, CheckCircle } from "lucide-react";
import { ContactDialog, type ContactForDialog } from "./contact-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type ContactRow = {
  id: string;
  name: string;
  tradeName: string | null;
  sriDocumentTypeCode?: string;
  sriPersonType?: string;
  taxId: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  isClient: boolean;
  isSupplier: boolean;
  isEmployee?: boolean;
  jobTitle?: string | null;
  salary?: string | null;
};

type ContactListProps = {
  companyId: string;
  type: "client" | "supplier" | "employee";
};

export function ContactList({ companyId, type }: ContactListProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactForDialog | null>(null);
  const [inactivatingId, setInactivatingId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const toastRef = useRef(toast);
  const hasShownConnectionError = useRef(false);
  toastRef.current = toast;

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/contacts/company/${companyId}?type=${type}`,
        { credentials: "include" }
      );
      if (!res.ok) {
        if (res.status === 401) {
          setContacts([]);
          return;
        }
        throw new Error("Error al cargar contactos");
      }
      const data = await res.json();
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      const isNetworkError =
        error instanceof TypeError &&
        (error.message === "Failed to fetch" || error.message === "Load failed");
      // Mostrar toast de conexión solo una vez para no saturar
      if (isNetworkError && !hasShownConnectionError.current) {
        hasShownConnectionError.current = true;
        toastRef.current({
          title: "Error de conexión",
          description: "No se puede conectar con el servidor. Asegúrate de tener el backend en ejecución (puerto 3001).",
          variant: "destructive",
        });
      } else if (!isNetworkError) {
        toastRef.current({
          title: "Error",
          description: "No se pudieron cargar los contactos.",
          variant: "destructive",
        });
      }
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, type]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function openNewDialog() {
    setEditingContact(null);
    setDialogOpen(true);
  }

  function openEditDialog(contact: ContactRow) {
    setEditingContact({
      id: contact.id,
      name: contact.name,
      tradeName: contact.tradeName,
      sriDocumentTypeCode: contact.sriDocumentTypeCode,
      sriPersonType: contact.sriPersonType,
      taxId: contact.taxId,
      email: contact.email,
      phone: contact.phone,
      address: contact.address,
      isClient: contact.isClient,
      isSupplier: contact.isSupplier,
      isEmployee: contact.isEmployee,
      jobTitle: contact.jobTitle,
      salary: contact.salary,
    });
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingContact(null);
  }

  async function handleInactivate(contact: ContactRow) {
    if (!confirm(`¿Inactivar a "${contact.name}"? El contacto no se eliminará y podrás activarlo de nuevo desde la lista.`)) {
      return;
    }
    setInactivatingId(contact.id);
    try {
      const res = await fetch(`${API_BASE}/contacts/${contact.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al inactivar");
      }
      toast({
        title: "Inactivado",
        description: "Contacto inactivado correctamente.",
        variant: "default",
      });
      await fetchContacts();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo inactivar.",
        variant: "destructive",
      });
    } finally {
      setInactivatingId(null);
    }
  }

  async function handleActivate(contact: ContactRow) {
    setActivatingId(contact.id);
    try {
      const res = await fetch(`${API_BASE}/contacts/${contact.id}/activate`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al activar");
      }
      toast({
        title: "Activado",
        description: "Contacto activado correctamente.",
        variant: "default",
      });
      await fetchContacts();
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo activar.",
        variant: "destructive",
      });
    } finally {
      setActivatingId(null);
    }
  }

  const newButtonLabel =
    type === "client" ? "Nuevo Cliente" : type === "supplier" ? "Nuevo Proveedor" : "Nuevo Empleado";

  const isEmployee = type === "employee";

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {type === "client" ? "Clientes" : type === "supplier" ? "Proveedores" : "Empleados"}
          </h1>
          <p className="text-slate-500">
            {type === "client"
              ? "Gestiona tu directorio de clientes."
              : type === "supplier"
                ? "Gestiona tu directorio de proveedores."
                : "Gestiona el directorio de empleados."}
          </p>
        </div>
        <Button
          className="bg-slate-900 hover:bg-slate-800 shadow-md"
          onClick={openNewDialog}
        >
          + {newButtonLabel}
        </Button>
      </div>

      <ContactDialog
        companyId={companyId}
        type={type}
        initialData={editingContact}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        onSuccess={fetchContacts}
      />

      <div className="rounded-md border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>{isEmployee ? "Nombre" : "Razón social"}</TableHead>
              <TableHead>RUC / CI</TableHead>
              {isEmployee && <TableHead>Cargo</TableHead>}
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isEmployee ? 8 : 7} className="h-24 text-center text-slate-500">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEmployee ? 8 : 7} className="h-24 text-center text-slate-500">
                  No hay contactos. Usa &quot;{newButtonLabel}&quot; para agregar uno.
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">
                    <div>{contact.name}</div>
                    {!isEmployee && contact.tradeName?.trim() ? (
                      <div className="text-xs font-normal text-slate-500" title={contact.tradeName}>
                        {contact.tradeName}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-slate-600 font-mono text-sm">
                    {contact.taxId}
                  </TableCell>
                  {isEmployee && (
                    <TableCell className="text-slate-600 text-sm">
                      {contact.jobTitle?.trim() ? contact.jobTitle : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-slate-500">
                    {contact.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {contact.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm max-w-[200px] truncate" title={typeof contact.address === "string" ? contact.address : undefined}>
                    {typeof contact.address === "string" && contact.address.trim() !== ""
                      ? contact.address
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        contact.isActive !== false
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-500 text-white hover:bg-red-600"
                      }
                    >
                      {contact.isActive !== false ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-slate-900"
                        aria-label="Editar"
                        onClick={() => openEditDialog(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {contact.isActive !== false ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Inactivar"
                          disabled={inactivatingId === contact.id}
                          onClick={() => handleInactivate(contact)}
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          aria-label="Activar"
                          disabled={activatingId === contact.id}
                          onClick={() => handleActivate(contact)}
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
    </>
  );
}
