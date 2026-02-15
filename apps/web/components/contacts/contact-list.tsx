"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  async function handleDelete(contact: ContactRow) {
    if (!confirm(`¿Eliminar a "${contact.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    setDeletingId(contact.id);
    try {
      const res = await fetch(`${API_BASE}/contacts/${contact.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Error al eliminar");
      }
      toast({
        title: "Eliminado",
        description: "Contacto eliminado correctamente.",
        variant: "default",
      });
      fetchContacts();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
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
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={isEmployee ? 7 : 6} className="h-24 text-center text-slate-500">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEmployee ? 7 : 6} className="h-24 text-center text-slate-500">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-red-600"
                        aria-label="Eliminar"
                        disabled={deletingId === contact.id}
                        onClick={() => handleDelete(contact)}
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
    </>
  );
}
