import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  FileCheck2,
  Search,
  ShieldCheck,
  XCircle,
  Copy,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { AppHeader } from "@/components/medicore/shared";
import { apiFetch, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pagos")({
  head: () => ({
    meta: [
      { title: "Historial de Pagos — MediCore OS" },
      { name: "description", content: "Historial de transacciones, pagos y comprobantes médicos." },
    ],
  }),
  component: PagosPage,
});

interface PagoItem {
  id: string;
  cita_id?: string;
  monto: number;
  moneda: string;
  referencia: string;
  metodo_pago: string;
  estado: string;
  concepto: string;
  fecha?: string;
  actualizado_en?: string;
}

export function PagosPage() {
  const user = getUser();
  const rawName = user?.nombre_completo || "Paciente";
  const firstName = rawName.split(" ")[0];
  const initials = rawName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "PA";

  const [pagos, setPagos] = useState<PagoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const loadPagos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<PagoItem[]>("/pagos/mis-pagos");
      if (Array.isArray(res)) {
        setPagos(res);
      }
    } catch (err) {
      console.error("Error al cargar pagos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPagos();
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return "Fecha no disponible";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("es-CO", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Stats
  const totalAprobado = pagos
    .filter((p) => p.estado.toLowerCase() === "aprobado")
    .reduce((acc, p) => acc + (p.monto || 0), 0);
  const countAprobados = pagos.filter((p) => p.estado.toLowerCase() === "aprobado").length;
  const countPendientes = pagos.filter((p) => p.estado.toLowerCase() === "pendiente").length;

  const filteredPagos = pagos.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchConcepto = p.concepto?.toLowerCase().includes(q);
    const matchRef = p.referencia?.toLowerCase().includes(q);
    const matchMetodo = p.metodo_pago?.toLowerCase().includes(q);
    return matchConcepto || matchRef || matchMetodo;
  });

  return (
    <DashboardShell>
      <AppHeader
        title="Historial de Pagos"
        subtitle="Registro y comprobantes de tus transacciones y consultas"
        name={rawName}
        initials={initials}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-8 space-y-6">
        {/* Metric / Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Total Pagado</span>
              <FileCheck2 className="size-4 text-primary" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground">
              ${totalAprobado.toLocaleString("es-CO")} <span className="text-xs font-normal text-muted-foreground">COP</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {countAprobados} {countAprobados === 1 ? "transacción aprobada" : "transacciones aprobadas"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Pagos Confirmados</span>
              <CheckCircle2 className="size-4 text-success" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground">
              {countAprobados}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Servicios médicos liquidados
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
              <span>Pagos Pendientes</span>
              <Clock3 className="size-4 text-warning" />
            </div>
            <div className="mt-2 font-display text-2xl font-bold text-foreground">
              {countPendientes}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Citas con pago pendiente
            </p>
          </div>
        </div>

        {/* Search Bar & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Transacciones registradas
            </h2>
            <p className="text-xs text-muted-foreground">
              Consulta el estado y detalle de cada transacción realizada
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por concepto o referencia..."
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
            Cargando historial de pagos...
          </div>
        ) : filteredPagos.length > 0 ? (
          <div className="grid gap-3">
            {filteredPagos.map((pago) => {
              const isAprobado = pago.estado.toLowerCase() === "aprobado";
              const isPendiente = pago.estado.toLowerCase() === "pendiente";
              const isRechazado = pago.estado.toLowerCase() === "rechazado";

              return (
                <div
                  key={pago.id}
                  className="relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/90"
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 w-1.5",
                      isAprobado && "bg-success",
                      isPendiente && "bg-warning",
                      isRechazado && "bg-destructive"
                    )}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-2">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-semibold text-foreground">
                          {pago.concepto || "Consulta Médica MediCore"}
                        </span>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md",
                            isAprobado && "bg-success/15 text-success",
                            isPendiente && "bg-warning/15 text-warning",
                            isRechazado && "bg-destructive/15 text-destructive"
                          )}
                        >
                          {isAprobado && <CheckCircle2 className="size-3" />}
                          {isPendiente && <Clock3 className="size-3" />}
                          {isRechazado && <XCircle className="size-3" />}
                          <span className="capitalize">{pago.estado}</span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock3 className="size-3.5" />
                          <span className="capitalize">{formatDate(pago.fecha || pago.actualizado_en)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="size-3.5 text-primary" />
                          <span>Método: {pago.metodo_pago === "wompi_sandbox" ? "Wompi Pasarela" : pago.metodo_pago}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-xs">
                        <span className="text-muted-foreground">Referencia:</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                          {pago.referencia}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(pago.referencia)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5 transition-colors"
                          title="Copiar referencia"
                        >
                          {copiedRef === pago.referencia ? (
                            <Check className="size-3 text-success" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end justify-center shrink-0">
                      <div className="font-display text-lg font-bold text-foreground">
                        ${Number(pago.monto).toLocaleString("es-CO")}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          {pago.moneda || "COP"}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {isAprobado ? "Transacción aprobada" : isPendiente ? "Pendiente por procesar" : "Transacción cancelada"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-12 text-center space-y-3">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
              <CreditCard className="size-6" />
            </div>
            <h3 className="font-display text-base font-medium text-foreground">
              No hay transacciones
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? "No se encontraron pagos que coincidan con la búsqueda."
                : "Aún no tienes registros de pagos ni transacciones en tu cuenta."}
            </p>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
