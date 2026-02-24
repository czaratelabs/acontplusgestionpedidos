"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { ArticleFormDialog } from "./article-form-dialog";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

function ArticleThumbnail({ article }: { article: Article }) {
  const mainImage = article.images?.find((i) => i.isMain) ?? article.images?.[0];
  if (!mainImage) return <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center" title="Sin imagen"><span className="text-slate-400 text-xs">—</span></div>;
  return (
    <img
      src={mainImage.url.startsWith("http") ? mainImage.url : `${API_BASE}${mainImage.url}`}
      alt=""
      className="w-10 h-10 rounded object-cover border border-slate-200"
    />
  );
}

type Brand = { id: string; name: string };
type Category = { id: string; name: string };
type Tax = { id: string; name: string; percentage: number };

type Price = { priceType: string; price: number; isDefault: boolean };
type Variant = {
  id: string;
  sku: string;
  barcode?: string | null;
  cost: number;
  colorId?: string | null;
  sizeId?: string | null;
  flavorId?: string | null;
  color?: { id: string; name: string } | null;
  size?: { id: string; name: string } | null;
  flavor?: { id: string; name: string } | null;
  measure?: string | null;
  stockActual: number;
  stockMin: number;
  prices?: Price[];
};

type ArticleImage = { id: string; url: string; isMain: boolean; sortOrder: number };
type Article = {
  id: string;
  name: string;
  brandId?: string | null;
  categoryId?: string | null;
  taxId?: string | null;
  brand?: { id: string; name: string } | null;
  category?: { id: string; name: string } | null;
  tax?: { id: string; name: string } | null;
  images?: ArticleImage[];
  variants: Variant[];
};

type CatalogItem = { id: string; name: string };
type ArticlesTableProps = {
  companyId: string;
  articles: Article[];
  brands: Brand[];
  categories: Category[];
  taxes: Tax[];
  measures?: CatalogItem[];
  colors?: CatalogItem[];
  sizes?: CatalogItem[];
  flavors?: CatalogItem[];
};

export function ArticlesTable({ companyId, articles, brands, categories, taxes, measures = [], colors = [], sizes = [], flavors = [] }: ArticlesTableProps) {
  const [articleToDelete, setArticleToDelete] = useState<Article | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  async function confirmDelete() {
    if (!articleToDelete) return;
    const id = articleToDelete.id;
    setDeletingId(id);
    setArticleToDelete(null);
    try {
      const res = await fetch(`${API_BASE}/articles/${id}?companyId=${encodeURIComponent(companyId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al eliminar");
      }
      router.refresh();
      toast({ title: "Artículo eliminado", description: "El artículo se ha eliminado correctamente." });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo eliminar.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-14"></TableHead>
              <TableHead>Artículo</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Variantes</TableHead>
              <TableHead>Impuesto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                  No hay artículos. Crea uno para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              articles.map((a) => (
                <TableRow key={a.id}>
                  <TableCell><ArticleThumbnail article={a} /></TableCell>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{a.brand?.name ?? "—"}</TableCell>
                  <TableCell>{a.category?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {a.variants?.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                        >
                          {v.sku}
                          {v.barcode && ` · ${v.barcode}`}
                          {(v.size?.name || v.color?.name || v.flavor?.name) &&
                            ` · ${[v.size?.name, v.color?.name, v.flavor?.name].filter(Boolean).join(' · ')}`}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{a.tax?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingArticle(a)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => setArticleToDelete(a)}
                        disabled={deletingId === a.id}
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

      <Dialog open={!!articleToDelete} onOpenChange={(open) => !open && setArticleToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar artículo?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las variantes asociadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArticleToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={() => confirmDelete()}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingArticle && (
        <ArticleFormDialog
          companyId={companyId}
          brands={brands}
          categories={categories}
          taxes={taxes}
          measures={measures}
          colors={colors}
          sizes={sizes}
          flavors={flavors}
          open={!!editingArticle}
          onOpenChange={(open) => !open && setEditingArticle(null)}
          initialData={editingArticle}
        />
      )}
    </>
  );
}
