import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  Stethoscope,
  User,
  X,
  Plus,
  Filter,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { AppHeader } from "@/components/medicore/shared";
import { apiFetch, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/citas")({
  head: () => ({
    meta: [
      { title: "Mis Citas Médicas — MediCore OS" },
      { name: "description", content: "Listado completo y gestión de citas médicas del paciente." },
    ],
  }),
  component: CitasPage,
});

interface CitaItem {
  id: string;
  fecha_hora: string;
  estado: string;
  motivo?: string;
  tipo?: string;
  medico_nombre?: string;
  sede_nombre?: string;
  especialidad_nombre?: string;
  pago_estado?: string;
  pago_monto?: number;
}

type FilterStatus = "todas" | "confirmada" | "pendiente" | "cancelada";

export function CitasPage() {
  const navigate = useNavigate();
  const user = getUser();
  const rawName = user?.nombre_completo || "Paciente";
  const firstName = rawName.split(" ")[0];
  const initials = rawName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "PA";

  const [citas, setCitas] = useState<CitaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCita, setSelectedCita] = useState<CitaItem | null>(null);

  const loadCitas = async () => {
    setLoading(true);
    try {
      const res = await apiFetch<CitaItem[]>("/citas/mis-citas");
      if (Array.isArray(res)) {
        setCitas(res);
      }
    } catch (err) {
      console.error("Error al cargar citas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCitas();

    const handleCitasUpdated = () => {
      loadCitas();
    };

    window.addEventListener("medicore:citas-updated", handleCitasUpdated);
    return () => {
      window.removeEventListener("medicore:citas-updated", handleCitasUpdated);
    };
  }, []);

  const formatDate = (isoString?: string) => {
    if (!isoString) return { dateStr: "Fecha no asignada", timeStr: "--:--" };
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return { dateStr: isoString, timeStr: "" };
    const dateStr = d.toLocaleDateString("es-CO", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const timeStr = d.toLocaleTimeString("es-CO", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { dateStr, timeStr };
  };

  const normalizeStatus = (estado: string): "Confirmada" | "Pendiente" | "Cancelada" => {
    const s = estado.toLowerCase();
    if (s === "confirmada" || s === "programada" || s === "completada") return "Confirmada";
    if (s === "cancelada") return "Cancelada";
    return "Pendiente";
  };

  const filteredCitas = citas.filter((cita) => {
    const statusNorm = normalizeStatus(cita.estado).toLowerCase();
    if (activeFilter !== "todas" && statusNorm !== activeFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDoc = cita.medico_nombre?.toLowerCase().includes(q);
      const matchEsp = cita.especialidad_nombre?.toLowerCase().includes(q);
      const matchSede = cita.sede_nombre?.toLowerCase().includes(q);
      const matchMotivo = cita.motivo?.toLowerCase().includes(q);
      return matchDoc || matchEsp || matchSede || matchMotivo;
    }
    return true;
  });

  const countFor = (status: FilterStatus) => {
    if (status === "todas") return citas.length;
    return citas.filter((c) => normalizeStatus(c.estado).toLowerCase() === status).length;
  };

  const handleAgendarNueva = () => {
    navigate({ to: "/paciente" });
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("medicore:chat-send", {
          detail: "Quiero agendar una cita médica",
        })
      );
    }, 150);
  };

  return (
    <DashboardShell>
      <AppHeader
        title="Mis Citas Médicas"
        subtitle="Listado completo y gestión de todas tus consultas"
        name={rawName}
        initials={initials}
      />
      <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-8 space-y-6">
        {/* Top Controls: Search, Tabs, Agendar button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card/60 p-1">
            {(
              [
                { id: "todas", label: "Todas" },
                { id: "confirmada", label: "Confirmadas" },
                { id: "pendiente", label: "Pendientes" },
                { id: "cancelada", label: "Canceladas" },
              ] as const
            ).map((tab) => {
              const count = countFor(tab.id);
              const isActive = activeFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-secondary text-primary font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por médico o especialidad..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button
              onClick={handleAgendarNueva}
              size="sm"
              className="gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="size-4" />
              Nueva cita
            </Button>
          </div>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
            Cargando historial de citas...
          </div>
        ) : filteredCitas.length > 0 ? (
          <div className="grid gap-3.5">
            {filteredCitas.map((cita) => {
              const { dateStr, timeStr } = formatDate(cita.fecha_hora);
              const status = normalizeStatus(cita.estado);
              const isPaid = cita.pago_estado === "aprobado";

              return (
                <div
                  key={cita.id}
                  className="relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/90"
                >
                  {/* Status Indicator Bar */}
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 w-1.5",
                      status === "Confirmada" && "bg-success",
                      status === "Pendiente" && "bg-warning",
                      status === "Cancelada" && "bg-destructive"
                    )}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-2">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-semibold text-foreground">
                          {cita.especialidad_nombre || "Consulta médica general"}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-md",
                            status === "Confirmada" && "bg-success/15 text-success",
                            status === "Pendiente" && "bg-warning/15 text-warning",
                            status === "Cancelada" && "bg-destructive/15 text-destructive"
                          )}
                        >
                          {status}
                        </span>
                        {isPaid ? (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                            Pagado
                          </span>
                        ) : status !== "Cancelada" ? (
                          <span className="text-[10px] font-normal px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            Pago pendiente
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                          <User className="size-3.5 text-primary" />
                          {cita.medico_nombre || "Profesional médico asignado"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock3 className="size-3.5" />
                          <span className="capitalize">{dateStr}</span> — {timeStr}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5" />
                          {cita.sede_nombre || "Sede Principal"}
                        </span>
                      </div>

                      {cita.motivo && (
                        <p className="text-xs text-muted-foreground/80 line-clamp-1 pt-1">
                          <span className="font-medium text-foreground/70">Motivo:</span> {cita.motivo}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 cursor-pointer border-border/80 hover:bg-muted"
                        onClick={() => setSelectedCita(cita)}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-12 text-center space-y-3">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-muted/60 text-muted-foreground">
              <CalendarDays className="size-6" />
            </div>
            <h3 className="font-display text-base font-medium text-foreground">
              No se encontraron citas
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeFilter !== "todas" || searchQuery
                ? "No hay citas que coincidan con los filtros aplicados. Prueba cambiando el filtro o la búsqueda."
                : "Actualmente no tienes citas registradas. Puedes solicitar una nueva cita directamente con nuestro asistente clínico."}
            </p>
            <div className="pt-2">
              <Button onClick={handleAgendarNueva} size="sm" className="gap-2 cursor-pointer">
                <Plus className="size-4" />
                Agendar cita con asistente
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Detalle de la Cita</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => setSelectedCita(null)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Especialidad</p>
                <p className="font-medium text-foreground">
                  {selectedCita.especialidad_nombre || "Medicina General"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profesional médico</p>
                <p className="font-medium text-foreground">
                  {selectedCita.medico_nombre || "Dr. Asignado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha y hora</p>
                <p className="font-medium text-foreground capitalize">
                  {formatDate(selectedCita.fecha_hora).dateStr} — {formatDate(selectedCita.fecha_hora).timeStr}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sede de atención (Presencial)</p>
                <p className="font-medium text-foreground">
                  {selectedCita.sede_nombre || "Sede Centro - Clínica del Parque"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Motivo de consulta</p>
                <p className="font-medium text-foreground">
                  {selectedCita.motivo || "Consulta médica general"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado de la cita</p>
                <p className="font-medium capitalize text-primary">
                  {normalizeStatus(selectedCita.estado)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado de pago</p>
                <p className="font-medium text-foreground">
                  {selectedCita.pago_estado === "aprobado"
                    ? "Aprobado / Pagado"
                    : "Pendiente de pago"}
                  {selectedCita.pago_monto ? ` · $${selectedCita.pago_monto.toLocaleString("es-CO")} COP` : ""}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedCita(null)} className="cursor-pointer">
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
