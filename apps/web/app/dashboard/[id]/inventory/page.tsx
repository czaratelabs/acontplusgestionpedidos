import Link from "next/link";
import { getArticles, getBrands, getCategories, getTaxes, getMeasures, getColors, getSizes, getFlavors } from "@/lib/api";
import { ArticleFormDialog } from "./article-form-dialog";
import { ArticlesTable } from "./articles-table";

export default async function InventoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [articles, brands, categories, taxes, measures, colors, sizes, flavors] = await Promise.all([
    getArticles(id),
    getBrands(id),
    getCategories(id),
    getTaxes(id),
    getMeasures(id),
    getColors(id),
    getSizes(id),
    getFlavors(id),
  ]);

  return (
    <div className="min-h-0 w-full max-w-[1600px] mx-auto space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      {/* Cabecera tipo escritorio: título + acción principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div className="min-w-0">
          <h1 className="font-acont text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Inventario
          </h1>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">
            Artículos con variantes (SKU, código de barras, precios y atributos).
            <Link
              href={`/dashboard/${id}/settings/catalogs`}
              className="ml-1 sm:ml-2 text-acont-primary font-medium hover:underline text-sm"
            >
              Configurar catálogos
            </Link>
          </p>
        </div>
        <div className="shrink-0">
          <ArticleFormDialog
            companyId={id}
            brands={brands}
            categories={categories}
            taxes={taxes}
            measures={measures}
            colors={colors}
            sizes={sizes}
            flavors={flavors}
          />
        </div>
      </div>

      {/* Contenedor tipo escritorio: superficie con borde y scroll responsive */}
      <div className="rounded-xl border border-slate-200 bg-acont-surface shadow-sm overflow-hidden">
        <ArticlesTable companyId={id} articles={articles} brands={brands} categories={categories} taxes={taxes} measures={measures} colors={colors} sizes={sizes} flavors={flavors} />
      </div>
    </div>
  );
}
