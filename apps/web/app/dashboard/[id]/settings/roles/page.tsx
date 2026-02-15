"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { RolesTableClient } from "./roles-table";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type Role = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  companyId: string | null;
};

export default function RolesSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const [roles, setRoles] = useState<Role[]>([]);
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
    fetch(`${API_BASE}/roles?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRoles(data);
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, router]);

  const refreshRoles = () => {
    fetch(`${API_BASE}/roles?companyId=${encodeURIComponent(companyId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setRoles(Array.isArray(data) ? data : []));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestión de Roles</h1>
        <p className="text-slate-500 text-sm mt-1">
          Define los roles disponibles para asignar a los usuarios. Los roles del sistema están disponibles
          para todas las empresas. Puedes crear roles personalizados para esta empresa.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500 py-8">Cargando roles...</p>
      ) : (
        <RolesTableClient
          roles={roles}
          companyId={companyId}
          onRefresh={refreshRoles}
        />
      )}
    </div>
  );
}
