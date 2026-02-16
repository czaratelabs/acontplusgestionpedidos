"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CURRENCY_OPTIONS } from "@/lib/currency";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const SYSTEM_TIMEZONE_KEY = "SYSTEM_TIMEZONE";
const SYSTEM_CURRENCY_KEY = "SYSTEM_CURRENCY";
const SYSTEM_DATE_FORMAT_KEY = "SYSTEM_DATE_FORMAT";

const TIMEZONE_RAW: { value: string; key: string }[] = [
  { value: "America/Guayaquil", key: "Guayaquil" },
  { value: "America/Bogota", key: "Bogota" },
  { value: "America/New_York", key: "NewYork" },
  { value: "Europe/Madrid", key: "Madrid" },
  { value: "UTC", key: "UTC" },
];

export default function GeneralSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: companyId } = use(params);
  const t = useTranslations("Settings");
  const tCommon = useTranslations("Common");
  const tFormat = useTranslations("GeneralSettings");
  const tCurrency = useTranslations("Currency");
  const tTimezone = useTranslations("Timezone");

  const DATE_FORMAT_OPTIONS = useMemo(
    () => [
      { value: "DD/MM/YYYY", label: tFormat("date_format_ddmmyyyy") },
      { value: "YYYY-MM-DD", label: tFormat("date_format_yyyymmdd") },
      { value: "MM/DD/YYYY", label: tFormat("date_format_mmddyyyy") },
      { value: "DD de MMM, YYYY", label: tFormat("date_format_verbose") },
    ],
    [tFormat]
  );

  const TIMEZONE_OPTIONS = useMemo(
    () => TIMEZONE_RAW.map((opt) => ({ value: opt.value, label: tTimezone(opt.key) })),
    [tTimezone]
  );

  const CURRENCY_OPTIONS_TRANSLATED = useMemo(
    () =>
      CURRENCY_OPTIONS.map((opt) => ({
        ...opt,
        label: tCurrency(opt.value),
      })),
    [tCurrency]
  );

  const [userRole, setUserRole] = useState<string | null>(null);
  const [systemTimezone, setSystemTimezone] = useState<string>("America/Guayaquil");
  const [loadingTimezone, setLoadingTimezone] = useState(true);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [systemCurrency, setSystemCurrency] = useState<string>("USD");
  const [loadingCurrency, setLoadingCurrency] = useState(true);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [systemDateFormat, setSystemDateFormat] = useState<string>("DD/MM/YYYY");
  const [loadingDateFormat, setLoadingDateFormat] = useState(true);
  const [savingDateFormat, setSavingDateFormat] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace(`/dashboard/${companyId}`);
      return;
    }
    try {
      const decoded = jwtDecode<{ role?: string }>(token);
      const role = decoded?.role ?? "seller";
      setUserRole(role);
      if (role !== "admin" && role !== "owner") {
        router.replace(`/dashboard/${companyId}`);
      }
    } catch {
      router.replace(`/dashboard/${companyId}`);
    }
  }, [companyId, router]);

  const isAdminOrOwnerForEffect = userRole === "admin" || userRole === "owner";
  const companyIdStable = companyId ?? "";
  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingTimezone(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_TIMEZONE_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setSystemTimezone(data.value);
      })
      .catch(() => {})
      .finally(() => setLoadingTimezone(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingCurrency(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_CURRENCY_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setSystemCurrency(data.value);
      })
      .catch(() => {})
      .finally(() => setLoadingCurrency(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  useEffect(() => {
    if (!isAdminOrOwnerForEffect || !companyIdStable) return;
    setLoadingDateFormat(true);
    const url = `${API_BASE}/system-settings/${SYSTEM_DATE_FORMAT_KEY}?companyId=${encodeURIComponent(companyIdStable)}`;
    const controller = new AbortController();
    fetch(url, { credentials: "include", signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { value?: string } | null) => {
        if (data?.value) setSystemDateFormat(data.value);
      })
      .catch(() => {})
      .finally(() => setLoadingDateFormat(false));
    return () => controller.abort();
  }, [isAdminOrOwnerForEffect, companyIdStable]);

  async function onSaveTimezone(value: string) {
    setSavingTimezone(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings/${SYSTEM_TIMEZONE_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setSystemTimezone(value);
      router.refresh();
      toast({
        title: t("success"),
        description: t("timezone_saved"),
        variant: "default",
      });
    } catch {
      toast({
        title: t("error"),
        description: t("timezone_error"),
        variant: "destructive",
      });
    } finally {
      setSavingTimezone(false);
    }
  }

  async function onSaveCurrency(value: string) {
    setSavingCurrency(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings/${SYSTEM_CURRENCY_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setSystemCurrency(value);
      router.refresh();
      toast({
        title: t("success"),
        description: t("currency_saved"),
        variant: "default",
      });
    } catch {
      toast({
        title: t("error"),
        description: t("currency_error"),
        variant: "destructive",
      });
    } finally {
      setSavingCurrency(false);
    }
  }

  async function onSaveDateFormat(value: string) {
    setSavingDateFormat(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings/${SYSTEM_DATE_FORMAT_KEY}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, value }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      setSystemDateFormat(value);
      router.refresh();
      toast({
        title: t("success"),
        description: t("date_format_saved"),
        variant: "default",
      });
    } catch {
      toast({
        title: t("error"),
        description: t("date_format_error"),
        variant: "destructive",
      });
    } finally {
      setSavingDateFormat(false);
    }
  }

  const isAdminOrOwner = userRole === "admin" || userRole === "owner";

  if (userRole === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("general_settings")}</h1>
        <Card><CardContent className="pt-6">{tCommon("loading")}</CardContent></Card>
      </div>
    );
  }

  if (!isAdminOrOwner) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("general_settings")}</h1>
        <Card><CardContent className="pt-6">{t("redirecting")}</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("general_settings")}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("general_description")}
        </p>
      </div>

      {/* Section: System Settings (timezone, currency, formato fecha) */}
      {isAdminOrOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t("timezone_title")}</CardTitle>
              <CardDescription>
                {t("timezone_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4 max-w-md">
                <div className="grid gap-2 flex-1 min-w-[200px]">
                  <Label htmlFor="system-timezone">{t("timezone_label")}</Label>
                  <Select
                    value={systemTimezone}
                    onValueChange={(v) => setSystemTimezone(v)}
                    disabled={loadingTimezone}
                  >
                    <SelectTrigger id="system-timezone">
                      <SelectValue placeholder={t("select_timezone")} />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => onSaveTimezone(systemTimezone)}
                  disabled={loadingTimezone || savingTimezone}
                >
                  {savingTimezone ? tCommon("saving") : t("save_timezone")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("currency_title")}</CardTitle>
              <CardDescription>
                {t("currency_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4 max-w-md">
                <div className="grid gap-2 flex-1 min-w-[200px]">
                  <Label htmlFor="system-currency">{t("currency_label")}</Label>
                  <Select
                    value={systemCurrency}
                    onValueChange={(v) => setSystemCurrency(v)}
                    disabled={loadingCurrency}
                  >
                    <SelectTrigger id="system-currency">
                      <SelectValue placeholder={t("select_currency")} />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS_TRANSLATED.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => onSaveCurrency(systemCurrency)}
                  disabled={loadingCurrency || savingCurrency}
                >
                  {savingCurrency ? tCommon("saving") : t("save_currency")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("date_format_title")}</CardTitle>
              <CardDescription>
                {t("date_format_description")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4 max-w-2xl">
                <div className="grid gap-2 flex-1 min-w-0">
                  <Label htmlFor="system-dateformat">{t("date_format_label")}</Label>
                  <Select
                    value={systemDateFormat}
                    onValueChange={(v) => setSystemDateFormat(v)}
                    disabled={loadingDateFormat}
                  >
                    <SelectTrigger id="system-dateformat">
                      <SelectValue placeholder={t("select_format")} />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => onSaveDateFormat(systemDateFormat)}
                  disabled={loadingDateFormat || savingDateFormat}
                >
                  {savingDateFormat ? tCommon("saving") : t("save_format")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
