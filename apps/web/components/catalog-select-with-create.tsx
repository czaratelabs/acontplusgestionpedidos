"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createCatalogItemClient, type CatalogItem } from "@/lib/api-client";

type CatalogKey = "brands" | "categories" | "measures" | "colors" | "sizes" | "flavors";

const CATALOG_LABELS: Record<CatalogKey, string> = {
  brands: "marca",
  categories: "categoría",
  measures: "medida",
  colors: "color",
  sizes: "talla",
  flavors: "sabor",
};

type CatalogSelectWithCreateProps = {
  companyId: string;
  catalogKey: CatalogKey;
  items: CatalogItem[];
  value: string;
  onChange: (value: string) => void;
  onItemCreated: (item: CatalogItem) => void;
  placeholder?: string;
  emptyLabel?: string;
  /** 'id' para brand/category, 'name' para color/size/flavor/measure */
  valueKey?: "id" | "name";
  className?: string;
  selectClassName?: string;
};

export function CatalogSelectWithCreate({
  companyId,
  catalogKey,
  items,
  value,
  onChange,
  onItemCreated,
  placeholder,
  emptyLabel = "—",
  valueKey = "id",
  className = "",
  selectClassName = "",
}: CatalogSelectWithCreateProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const label = CATALOG_LABELS[catalogKey];

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) {
      toast({ title: "Error", description: "El nombre es obligatorio.", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const created = await createCatalogItemClient(companyId, catalogKey, trimmed);
      if (!created) {
        toast({ title: "Error", description: `No se pudo crear la ${label}.`, variant: "destructive" });
        return;
      }
      onItemCreated(created);
      onChange(valueKey === "id" ? created.id : created.name);
      setNewName("");
      setDialogOpen(false);
      toast({ title: "Creado", description: `Se ha añadido "${created.name}" al catálogo.` });
    } catch {
      toast({ title: "Error", description: "No se pudo crear.", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  const emptyValue = valueKey === "id" ? "none" : "none";

  return (
    <div className={`flex gap-1 items-center ${className}`}>
      <Select
        value={value || emptyValue}
        onValueChange={(v) => onChange(v === emptyValue ? "" : v)}
      >
        <SelectTrigger className={`h-8 flex-1 ${selectClassName}`}>
          <SelectValue placeholder={placeholder ?? `Seleccionar ${label}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>
          {items.map((item) => (
            <SelectItem
              key={item.id}
              value={valueKey === "id" ? item.id : item.name}
            >
              {item.name}
            </SelectItem>
          ))}
          {value && valueKey === "name" && !items.some((i) => i.name === value) && (
            <SelectItem value={value}>{value}</SelectItem>
          )}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => setDialogOpen(true)}
        title={`Crear nueva ${label}`}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva {label}</DialogTitle>
            <DialogDescription>
              Añade una nueva {label} al catálogo para usarla en artículos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor={`create-${catalogKey}`}>Nombre</Label>
            <Input
              id={`create-${catalogKey}`}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={placeholder ?? `Ej: ${label}`}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creando..." : "Crear y seleccionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
