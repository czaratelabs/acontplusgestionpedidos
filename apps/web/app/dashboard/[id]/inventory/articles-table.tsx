"use client";

import { useState, useEffect } from "react";
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
import { apiGet, apiDelete, API_BASE } from "@/lib/api-client";
const TARIFF_NAMES_KEY = "TARIFF_NAMES";
const DEFAULT_TARIFF_LABELS: Record<string, string> = {
  "1": "Tarifa 1",
  "2": "Tarifa 2",
  "3": "Tarifa 3",
  "4": "Tarifa 4",
  "5": "Tarifa 5",
};

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

type VariantPrice = {
  pvp1?: number;
  pvp2?: number;
  pvp3?: number;
  pvp4?: number;
  pvp5?: number;
  rentabilidad1?: number;
  rentabilidad2?: number;
  rentabilidad3?: number;
  rentabilidad4?: number;
  rentabilidad5?: number;
};
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
  prices?: VariantPrice[];
};

type ArticleImage = { id: string; url: string; isMain: boolean; sortOrder: number };
type Article = {
  id: string;
  code?: string | null;
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
  const [articleFormOpen, setArticleFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [tariffLabels, setTariffLabels] = useState<Record<string, string>>({ ...DEFAULT_TARIFF_LABELS });
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();
    const url = `/system-settings/${TARIFF_NAMES_KEY}?companyId=${encodeURIComponent(companyId)}`;
    apiGet<{ value?: string } | null>(url, { signal: controller.signal })
      .then((data) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value) as Record<string, string>;
            if (parsed && typeof parsed === "object")
              setTariffLabels({ ...DEFAULT_TARIFF_LABELS, ...parsed });
          } catch {
            /* usar defaults */
          }
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [companyId]);

  async function confirmDelete() {
    if (!articleToDelete) return;
    const id = articleToDelete.id;
    setDeletingId(id);
    setArticleToDelete(null);
    try {
      await apiDelete(`/articles/${id}?companyId=${encodeURIComponent(companyId)}`);
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
      <div className="overflow-x-auto overflow-y-hidden -mx-px">
        <Table className="min-w-[800px]">
          <TableHeader>
            <TableRow className="bg-acont-primary/10 border-b-2 border-acont-primary/20">
              <TableHead className="w-14 text-slate-700 font-semibold"></TableHead>
              <TableHead className="text-slate-800 font-semibold">Artículo</TableHead>
              <TableHead className="text-slate-800 font-semibold">Marca</TableHead>
              <TableHead className="text-slate-800 font-semibold">Categoría</TableHead>
              <TableHead className="text-slate-800 font-semibold">Variantes</TableHead>
              <TableHead className="text-right text-slate-800 font-semibold">{tariffLabels["1"] ?? "Tarifa 1"}</TableHead>
              <TableHead className="text-right text-slate-800 font-semibold">{tariffLabels["2"] ?? "Tarifa 2"}</TableHead>
              <TableHead className="text-right text-slate-800 font-semibold">{tariffLabels["3"] ?? "Tarifa 3"}</TableHead>
              <TableHead className="text-right text-slate-800 font-semibold">{tariffLabels["4"] ?? "Tarifa 4"}</TableHead>
              <TableHead className="text-right text-slate-800 font-semibold">{tariffLabels["5"] ?? "Tarifa 5"}</TableHead>
              <TableHead className="text-slate-800 font-semibold">Impuesto</TableHead>
              <TableHead className="text-right text-slate-800 font-semibold min-w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-center text-slate-500 py-12 sm:py-16 text-sm sm:text-base">
                  No hay artículos. Crea uno para comenzar.
                </TableCell>
              </TableRow>
            ) : (
              articles.flatMap((a) => {
                const variantCount = a.variants?.length || 1;
                return (a.variants?.length ? a.variants : [null]).map((variant, vIdx) => {
                  const prices = variant?.prices?.[0];
                  const isFirst = vIdx === 0;
                  const variantLabel = variant
                    ? [variant.sku, variant.barcode, variant.color?.name, variant.size?.name, variant.flavor?.name]
                        .filter(Boolean)
                        .join(" · ")
                    : "—";

                  return (
                    <TableRow
                      key={`${a.id}-${vIdx}`}
                      className={isFirst ? "border-t-2 border-slate-200" : undefined}
                    >
                      {isFirst && (
                        <TableCell rowSpan={variantCount}>
                          <ArticleThumbnail article={a} />
                        </TableCell>
                      )}
                      {isFirst && (
                        <TableCell rowSpan={variantCount}>
                          <div className="font-medium">{a.name}</div>
                          {a.code && <div className="text-xs text-slate-500">{a.code}</div>}
                        </TableCell>
                      )}
                      {isFirst && (
                        <TableCell rowSpan={variantCount}>{a.brand?.name ?? "—"}</TableCell>
                      )}
                      {isFirst && (
                        <TableCell rowSpan={variantCount}>{a.category?.name ?? "—"}</TableCell>
                      )}
                      <TableCell>
                        <span className="text-xs text-acont-primary font-medium">{variantLabel}</span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {prices?.pvp1 != null && Number(prices.pvp1) > 0 ? Number(prices.pvp1).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {prices?.pvp2 != null && Number(prices.pvp2) > 0 ? Number(prices.pvp2).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {prices?.pvp3 != null && Number(prices.pvp3) > 0 ? Number(prices.pvp3).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {prices?.pvp4 != null && Number(prices.pvp4) > 0 ? Number(prices.pvp4).toFixed(2) : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-xs">
                        {prices?.pvp5 != null && Number(prices.pvp5) > 0 ? Number(prices.pvp5).toFixed(2) : "—"}
                      </TableCell>
                      {isFirst && (
                        <TableCell rowSpan={variantCount}>{a.tax?.name ?? "—"}</TableCell>
                      )}
                      {isFirst && (
                        <TableCell rowSpan={variantCount} className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 border-acont-primary/30 text-acont-primary hover:bg-acont-primary/10"
                              onClick={() => {
                                setEditingArticle(a);
                                setArticleFormOpen(true);
                              }}
                              aria-label="Editar artículo"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                              onClick={() => setArticleToDelete(a)}
                              disabled={deletingId === a.id}
                              aria-label="Eliminar artículo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                });
              })
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

      {articleFormOpen && (
        <ArticleFormDialog
          companyId={companyId}
          brands={brands}
          categories={categories}
          taxes={taxes}
          measures={measures}
          colors={colors}
          sizes={sizes}
          flavors={flavors}
          open={articleFormOpen}
          onOpenChange={(open) => {
            if (!open) {
              setArticleFormOpen(false);
              setEditingArticle(null);
            }
          }}
          onRequestNew={() => setEditingArticle(null)}
          initialData={editingArticle}
        />
      )}
    </>
  );
}
