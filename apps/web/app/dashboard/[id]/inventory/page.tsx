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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventario</h1>
          <p className="text-slate-500 mt-1">
            Artículos con variantes (SKU, código de barras, precios y atributos).
            <Link href={`/dashboard/${id}/settings/catalogs`} className="ml-2 text-blue-600 hover:underline text-sm">
              Configurar catálogos
            </Link>
          </p>
        </div>
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

      <ArticlesTable companyId={id} articles={articles} brands={brands} categories={categories} taxes={taxes} measures={measures} colors={colors} sizes={sizes} flavors={flavors} />
    </div>
  );
}
