"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { TaxesTable } from "./taxes-table";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Tax = {
  id: string;
  name: string;
  percentage: number;
  code: string | null;
  is_active: boolean;
};

export default function TaxesSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace(`/dashboard/${companyId}`);
      return;
    }
    try {
      const decoded = jwtDecode<{ role?: string }>(token);
      const role = decoded?.role ?? "seller";
      if (role !== "admin" && role !== "owner") {
        router.replace(`/dashboard/${companyId}`);
        return;
      }
    } catch {
      router.replace(`/dashboard/${companyId}`);
      return;
    }

    let cancelled = false;
    fetch(`${API_BASE}/taxes/company/${encodeURIComponent(companyId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setTaxes(data);
      })
      .catch(() => {
        if (!cancelled) setTaxes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  const refreshTaxes = () => {
    fetch(`${API_BASE}/taxes/company/${encodeURIComponent(companyId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTaxes(Array.isArray(data) ? data : []));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración de Impuestos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gestiona las tarifas de IVA (12%, 15%, 0%) y retenciones para facturación electrónica.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 py-8">Cargando impuestos...</p>
      ) : (
        <TaxesTable
          taxes={taxes}
          companyId={companyId}
          onRefresh={refreshTaxes}
        />
      )}
    </div>
  );
}
