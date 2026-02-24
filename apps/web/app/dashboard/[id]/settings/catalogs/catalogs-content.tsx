"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type CatalogItem = { id: string; name: string };

const CATALOG_CONFIG = {
  brands: { label: "Marcas", path: "brands", title: "marca" },
  categories: { label: "Categorías", path: "categories", title: "categoría" },
  measures: { label: "Medidas", path: "measures", title: "medida" },
  colors: { label: "Colores", path: "colors", title: "color" },
  sizes: { label: "Tallas", path: "sizes", title: "talla" },
  flavors: { label: "Sabores", path: "flavors", title: "sabor" },
} as const;

type CatalogKey = keyof typeof CATALOG_CONFIG;

type CatalogsContentProps = {
  companyId: string;
  data: Record<CatalogKey, CatalogItem[]>;
  onRefresh: () => void;
};

function CatalogTable({
  companyId,
  catalogKey,
  items,
  onRefresh,
}: {
  companyId: string;
  catalogKey: CatalogKey;
  items: CatalogItem[];
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CatalogItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const config = CATALOG_CONFIG[catalogKey];

  const basePath = `${API_BASE}/articles/catalogs/company/${companyId}/${config.path}`;

  function openNew() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(item: CatalogItem) {
    setEditing(item);
    setName(item.name);
    setDialogOpen(true);
  }

  function handleDialogClose(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditing(null);
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        const res = await fetch(`${basePath}/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? "Error al actualizar");
        }
        toast({ title: "Actualizado", description: `La ${config.title} se ha actualizado.` });
      } else {
        const res = await fetch(basePath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message ?? "Error al crear");
        }
        toast({ title: "Creado", description: `La ${config.title} se ha creado.` });
      }
      handleDialogClose(false);
      onRefresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo guardar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${basePath}/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al eliminar");
      }
      toast({ title: "Eliminado", description: `La ${config.title} se ha eliminado.` });
      setDeleteTarget(null);
      onRefresh();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo eliminar.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{config.label}</CardTitle>
            <CardDescription>
              Registra las {config.label.toLowerCase()} disponibles para los artículos
            </CardDescription>
          </div>
          <Button size="sm" onClick={openNew} className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" />
            Nuevo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Nombre</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-slate-500 py-6">
                    No hay {config.label.toLowerCase()}. Añade una con el botón Nuevo.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(item)}
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
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${config.title}` : `Nueva ${config.title}`}</DialogTitle>
            <DialogDescription>
              {editing
                ? `Modifica el nombre de la ${config.title}.`
                : `Añade una nueva ${config.title} al catálogo.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Ej: ${config.label === "Marcas" ? "Nike" : config.label === "Categorías" ? "Ropa" : config.label === "Medidas" ? "Unidad" : config.label === "Colores" ? "Rojo" : config.label === "Tallas" ? "M" : "Chocolate"}`}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogClose(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Guardando..." : editing ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar {config.title}?</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar &quot;{deleteTarget?.name}&quot;? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CatalogsContent({ companyId, data, onRefresh }: CatalogsContentProps) {
  return (
    <Tabs defaultValue="brands" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
        {Object.entries(CATALOG_CONFIG).map(([key, cfg]) => (
          <TabsTrigger key={key} value={key}>
            {cfg.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {(Object.keys(CATALOG_CONFIG) as CatalogKey[]).map((key) => (
        <TabsContent key={key} value={key} className="mt-4">
          <CatalogTable
            companyId={companyId}
            catalogKey={key}
            items={data[key]}
            onRefresh={onRefresh}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
