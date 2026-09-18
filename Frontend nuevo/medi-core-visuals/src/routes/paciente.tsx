import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarPlus, Clock3, Filter, MapPin, Stethoscope, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { PatientChat } from "@/components/medicore/patient-chat";
import { AppHeader, SectionHeading, StatusLine } from "@/components/medicore/shared";
import { apiFetch, getUser } from "@/lib/api";

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
  const [loadingPayId, setLoadingPayId] = useState<string | null>(null);

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
      }
    } catch {
      // Keep defaults if network fails
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimularPago = async (citaId: string) => {
    setLoadingPayId(citaId);
    try {
      await apiFetch("/pagos/simular", {
        method: "POST",
        body: JSON.stringify({
          cita_id: citaId,
          metodo: "wompi_sandbox",
        }),
      });
      await loadData();
    } catch {
      // ignore
    } finally {
      setLoadingPayId(null);
    }
  };

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
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Button
              className="group h-auto min-h-36 flex-col items-stretch justify-between whitespace-normal p-5 text-left"
              size="lg"
            >
              <span className="grid size-10 place-items-center rounded-md bg-background/15">
                <CalendarPlus />
              </span>
              <div>
                <div className="mt-1 flex items-end justify-between gap-3">
                  <h2 className="font-display text-xl font-semibold">Agendar una cita</h2>
                  <ArrowRight className="mb-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-36 flex-col items-stretch justify-between whitespace-normal bg-card p-5 text-left"
              size="lg"
            >
              <span className="grid size-10 place-items-center rounded-md bg-secondary text-primary">
                <Filter />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold">Filtrar por doctor</h2>
                <p className="mt-2 text-sm font-normal text-muted-foreground">
                  Encuentra disponibilidad por especialista.
                </p>
              </div>
            </Button>
          </section>
          <section>
            <SectionHeading
              title="Próxima cita"
              action={
                <Button variant="ghost" size="sm">
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
                  <Button className="sm:col-span-2 xl:col-span-1">
                    <Video /> Unirme
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-border bg-card p-5 text-center text-sm text-muted-foreground">
                No tienes citas programadas. Puedes solicitar una usando el chat con el asistente.
              </div>
            )}
          </section>
          <details className="group rounded-md border border-border bg-card/40 p-4">
            <summary className="cursor-pointer list-none font-display text-base font-semibold">
              Especialidades disponibles
            </summary>
            <div className="mt-3 divide-y divide-border">
              {specialties.map((item) => (
                <Button
                  key={item}
                  variant="ghost"
                  className="h-auto w-full justify-between rounded-none py-4"
                >
                  <span className="flex items-center gap-3">
                    <Stethoscope className="size-4 text-muted-foreground" />
                    {item}
                  </span>
                  <ArrowRight className="size-4" />
                </Button>
              ))}
            </div>
          </details>
          <section>
            <SectionHeading title="Mis citas y pagos" />
            <div className="space-y-2 rounded-md bg-card/50 px-5">
              {citas.length > 0 ? (
                citas.map((cita) => {
                  const f = formatDateInfo(cita.fecha_hora);
                  const isPaid = cita.pago_estado === "aprobado";
                  const statusMap: Record<string, "Confirmada" | "Pendiente" | "Cancelada"> = {
                    confirmada: "Confirmada",
                    programada: "Confirmada",
                    completada: "Confirmada",
                    pendiente: "Pendiente",
                    cancelada: "Cancelada",
                  };
                  const displayStatus = statusMap[cita.estado.toLowerCase()] || "Pendiente";
                  const monto = cita.pago_monto ? `$${cita.pago_monto.toLocaleString("es-CO")}` : "$120.000";
                  const detailText = isPaid ? `${monto} · Pagado` : `${monto} · Pendiente`;

                  return (
                    <StatusLine key={cita.id} status={displayStatus}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium">
                            {cita.especialidad_nombre || "Consulta"} · {f.day} {f.month}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{detailText}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isPaid && cita.estado !== "cancelada" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={loadingPayId === cita.id}
                              onClick={() => handleSimularPago(cita.id)}
                            >
                              {loadingPayId === cita.id ? "Procesando..." : "Pagar"}
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">{displayStatus}</span>
                        </div>
                      </div>
                    </StatusLine>
                  );
                })
              ) : (
                [
                  ["Confirmada", "Cardiología · 22 Sep", "$145.000 · Pagado"],
                  ["Pendiente", "Dermatología · 2 Oct", "$110.000 · Pendiente"],
                  ["Cancelada", "Medicina general · 9 Sep", "Sin cobro"],
                ].map(([status, title, detail]) => (
                  <StatusLine key={title} status={status as "Confirmada" | "Pendiente" | "Cancelada"}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{status}</span>
                    </div>
                  </StatusLine>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
