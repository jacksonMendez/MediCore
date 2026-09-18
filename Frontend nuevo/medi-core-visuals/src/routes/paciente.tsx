import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarPlus, Clock3, Filter, MapPin, Stethoscope, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { PatientChat } from "@/components/medicore/patient-chat";
import { AppHeader, SectionHeading, StatusLine } from "@/components/medicore/shared";

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

function PatientPage() {
  const specialties = ["Medicina general", "Cardiología", "Dermatología", "Pediatría"];
  return (
    <DashboardShell>
      <AppHeader
        title="Hola, Laura"
        subtitle="Aquí tienes el resumen de tu atención"
        name="Laura Méndez"
        initials="LM"
      />
      <div className="grid gap-6 p-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.7fr)] lg:p-8">
        <PatientChat />
        <div className="space-y-6">
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
             <div className="relative overflow-hidden rounded-md border border-primary/30 bg-card p-5">
              <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
               <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center xl:grid-cols-1">
                <div className="text-center">
                  <p className="font-display text-3xl font-semibold">22</p>
                  <p className="text-sm text-primary">Sep</p>
                </div>
                <div>
                  <p className="font-display text-lg font-semibold">Consulta de cardiología</p>
                  <p className="mt-1 text-sm text-muted-foreground">Dra. María Fernanda Ruiz</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="size-4" />
                      10:30 a. m.
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      Sede Norte · Consultorio 304
                    </span>
                  </div>
                </div>
                 <Button className="sm:col-span-2 xl:col-span-1"><Video /> Unirme</Button>
              </div>
            </div>
          </section>
          <details className="group rounded-md border border-border bg-card/40 p-4">
            <summary className="cursor-pointer list-none font-display text-base font-semibold">Especialidades disponibles</summary>
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
              {[
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
              ))}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
