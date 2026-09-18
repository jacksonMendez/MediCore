import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3, MapPin, Stethoscope, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { PatientChat } from "@/components/medicore/patient-chat";
import { AppHeader, SectionHeading, StatusLine } from "@/components/medicore/shared";
import { apiFetch, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/paciente")({
  head: () => ({
    meta: [
      { title: "Portal Paciente — MediCore OS" },
      { name: "description", content: "Citas, consultas y pagos del portal paciente." },
      { property: "og:title", content: "Portal Paciente — MediCore OS" },
      { property: "og:description", content: "Experiencia visual del portal para pacientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientPage,
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

interface EspecialidadItem {
  id: string;
  nombre: string;
  descripcion?: string;
  precio_base?: number;
}

function PatientPage() {
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
  const [specialties, setSpecialties] = useState<string[]>([
    "Medicina General",
    "Cardiología",
    "Pediatría",
  ]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  const loadData = async () => {
    try {
      const [citasRes, espRes] = await Promise.allSettled([
        apiFetch<CitaItem[]>("/citas/mis-citas"),
        apiFetch<EspecialidadItem[]>("/especialidades"),
      ]);

      if (citasRes.status === "fulfilled" && Array.isArray(citasRes.value)) {
        setCitas(citasRes.value);
      }
      if (espRes.status === "fulfilled" && Array.isArray(espRes.value) && espRes.value.length > 0) {
        setSpecialties(espRes.value.map((e) => e.nombre));
      } else {
        setSpecialties(["Medicina General", "Cardiología", "Pediatría"]);
      }
    } catch {
      setSpecialties(["Medicina General", "Cardiología", "Pediatría"]);
    }
  };

  useEffect(() => {
    loadData();

    const handleCitasUpdated = () => {
      loadData();
    };

    window.addEventListener("medicore:citas-updated", handleCitasUpdated);
    return () => {
      window.removeEventListener("medicore:citas-updated", handleCitasUpdated);
    };
  }, []);

  // Encontrar la próxima cita activa
  const proximaCita = citas.find((c) => c.estado !== "cancelada") || citas[0];

  const formatDateInfo = (isoString?: string) => {
    if (!isoString) {
      return { day: "22", month: "Sep", time: "10:30 a. m." };
    }
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { day: "22", month: "Sep", time: "10:30 a. m." };
    }
    const day = d.getDate().toString();
    const month = d.toLocaleDateString("es-CO", { month: "short" });
    const time = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    return { day, month, time };
  };

  const proximaFecha = formatDateInfo(proximaCita?.fecha_hora);

  return (
    <DashboardShell>
      <AppHeader
        title={`Hola, ${firstName}`}
        subtitle="Aquí tienes el resumen de tu atención"
        name={rawName}
        initials={initials}
      />
      <div className="flex-1 min-h-0 grid gap-6 p-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.75fr)] lg:p-6 lg:overflow-hidden">
        <div className="h-full min-h-0 flex flex-col">
          <PatientChat className="h-full min-h-0" />
        </div>
        <div className="h-full min-h-0 lg:overflow-y-auto space-y-6 pr-1">
          <section>
            <SectionHeading
              title="Próxima cita"
              action={
                <Button variant="ghost" size="sm" onClick={() => setShowDetalleModal(true)} className="cursor-pointer">
                  Ver detalles <ArrowRight />
                </Button>
              }
            />
            {proximaCita ? (
              <div className="relative overflow-hidden rounded-md border border-primary/30 bg-card p-5">
                <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
                <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center xl:grid-cols-1">
                  <div className="text-center">
                    <p className="font-display text-3xl font-semibold">{proximaFecha.day}</p>
                    <p className="text-sm capitalize text-primary">{proximaFecha.month}</p>
                  </div>
                  <div>
                    <p className="font-display text-lg font-semibold">
                      {proximaCita.especialidad_nombre || "Consulta médica"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {proximaCita.medico_nombre || "Dr. Asignado"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock3 className="size-4" />
                        {proximaFecha.time}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-4" />
                        {proximaCita.sede_nombre || "Sede Principal"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-card p-5 text-center text-sm text-muted-foreground">
                No tienes citas programadas. Puedes solicitar una usando el chat con el asistente.
              </div>
            )}
          </section>

          {/* Especialidades disponibles (siempre visible) */}
          <section className="rounded-md border border-border bg-card/40 p-4">
            <SectionHeading title="Especialidades disponibles" />
            <div className="divide-y divide-border">
              {specialties.map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  className="h-auto w-full justify-between rounded-none py-3.5 px-2 cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("medicore:chat-send", {
                        detail: `Quiero consultar disponibilidad para ${item}`,
                      })
                    );
                  }}
                >
                  <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <Stethoscope className="size-4 text-primary" />
                    {item}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </section>

          {/* Mis citas y pagos (mismo endpoint y estados limpios) */}
          <section>
            <SectionHeading
              title="Mis citas y pagos"
              action={
                <Button variant="ghost" size="sm" asChild className="cursor-pointer text-xs">
                  <Link to="/citas">
                    Ver todas <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              }
            />
            <div className="space-y-2 rounded-md bg-card/50 px-5 py-2">
              {citas.length > 0 ? (
                citas.map((cita) => {
                  const f = formatDateInfo(cita.fecha_hora);
                  const isPaid = cita.pago_estado === "aprobado";
                  const statusMap: Record<string, "Confirmada" | "Pendiente" | "Cancelada"> = {
                    confirmada: "Confirmada",
                    programada: "Confirmada",
                    completada: "Confirmada",
                    pendiente: "Pendiente",
                    pendiente_pago: "Pendiente",
                    cancelada: "Cancelada",
                  };
                  const displayStatus = statusMap[cita.estado.toLowerCase()] || "Pendiente";
                  
                  let paymentDetail = "";
                  if (displayStatus === "Cancelada") {
                    paymentDetail = "Cita cancelada";
                  } else if (isPaid) {
                    const monto = cita.pago_monto ? `$${cita.pago_monto.toLocaleString("es-CO")} COP` : "$50.000 COP";
                    paymentDetail = `Pago aprobado · ${monto}`;
                  } else {
                    const monto = cita.pago_monto ? ` · $${cita.pago_monto.toLocaleString("es-CO")} COP` : "";
                    paymentDetail = `Pendiente de pago${monto}`;
                  }

                  return (
                    <StatusLine key={cita.id} status={displayStatus}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {cita.especialidad_nombre || "Consulta"} · {f.day} {f.month}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {cita.medico_nombre ? `${cita.medico_nombre} · ` : ""}
                            {paymentDetail}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[11px] font-medium px-2 py-0.5 rounded-md",
                              displayStatus === "Confirmada" && "bg-success/15 text-success",
                              displayStatus === "Pendiente" && "bg-warning/15 text-warning",
                              displayStatus === "Cancelada" && "bg-destructive/15 text-destructive"
                            )}
                          >
                            {displayStatus}
                          </span>
                        </div>
                      </div>
                    </StatusLine>
                  );
                })
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  No tienes citas registradas actualmente.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {showDetalleModal && proximaCita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display text-lg font-semibold text-foreground">Detalle de la Cita</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setShowDetalleModal(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <div className="mt-4 space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Especialidad</p>
                <p className="font-medium text-foreground">{proximaCita.especialidad_nombre || "Medicina General"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profesional médico</p>
                <p className="font-medium text-foreground">{proximaCita.medico_nombre || "Dr. Asignado"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha y hora</p>
                <p className="font-medium text-foreground">{proximaFecha.day} {proximaFecha.month} — {proximaFecha.time}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sede de atención (Presencial)</p>
                <p className="font-medium text-foreground">{proximaCita.sede_nombre || "Sede Principal"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Motivo de consulta</p>
                <p className="font-medium text-foreground">{proximaCita.motivo || "Consulta médica general"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado de la cita</p>
                <p className="font-medium capitalize text-primary">{proximaCita.estado}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowDetalleModal(false)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
