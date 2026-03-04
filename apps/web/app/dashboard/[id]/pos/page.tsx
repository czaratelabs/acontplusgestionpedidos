"use client";

import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type VariantSearchResult = {
  id: string;
  sku: string;
  barcode?: string | null;
  cost: number;
  articleCode?: string | null;
  article?: { id: string; name: string; code?: string | null };
  color?: { id: string; name: string } | null;
  size?: { id: string; name: string } | null;
  flavor?: { id: string; name: string } | null;
  prices?: Array<{
    precioVenta1?: number;
    precioVenta2?: number;
    pvp1?: number;
    [key: string]: unknown;
  }>;
};

export default function POSPage({ params }: { params: Promise<{ id: string }> }) {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<VariantSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    params.then((p) => setCompanyId(p.id));
  }, [params]);

  const searchVariants = useCallback(
    async (q: string) => {
      if (!companyId || !q.trim()) {
        setVariants([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/articles/company/${companyId}/search-variants?q=${encodeURIComponent(q.trim())}`,
          { credentials: "include" }
        );
        if (!res.ok) throw new Error("Error en búsqueda");
        const data = await res.json();
        setVariants(Array.isArray(data) ? data : []);
      } catch {
        setVariants([]);
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  useEffect(() => {
    const t = setTimeout(() => searchVariants(query), 200);
    return () => clearTimeout(t);
  }, [query, searchVariants]);

  if (!companyId) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-slate-500 mt-1">
          Escanea o escribe el código de barras, SKU o el <strong>Código Maestro</strong> para listar variantes.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Buscar artículo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="pos-search">Código, SKU o nombre</Label>
            <Input
              id="pos-search"
              type="text"
              placeholder="Código maestro, SKU, código de barras..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 max-w-md"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-1">
              Si escribes el Código Maestro, se mostrarán todas las variantes (colores/tallas/sabores) de ese artículo.
            </p>
          </div>

          {loading && <p className="text-sm text-slate-500">Buscando...</p>}

          {!loading && query.trim() && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700">
                {variants.length === 0
                  ? "Sin resultados"
                  : variants.length === 1
                    ? "1 variante"
                    : `${variants.length} variantes`}
              </h3>
              <ul className="divide-y rounded-lg border bg-slate-50/50 overflow-hidden">
                {variants.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white transition-colors"
                  >
                    <div>
                      <span className="font-medium">{v.article?.name ?? "—"}</span>
                      {v.article?.code && (
                        <span className="ml-2 text-xs text-slate-500">({v.article.code})</span>
                      )}
                      <div className="text-sm text-slate-600 mt-0.5">
                        SKU: {v.sku}
                        {v.barcode && ` · Cód. barras: ${v.barcode}`}
                        {[v.color?.name, v.size?.name, v.flavor?.name].filter(Boolean).length > 0 && (
                          <span className="ml-2">
                            · {[v.color?.name, v.size?.name, v.flavor?.name].filter(Boolean).join(" / ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right tabular-nums">
                      <div className="font-medium">
                        €{Number(v.prices?.[0]?.precioVenta1 ?? v.prices?.[0]?.precioVenta2 ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-500">PVP €{Number(v.prices?.[0]?.pvp1 ?? 0).toFixed(2)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
