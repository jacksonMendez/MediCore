import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Clock3, FileText, Search, Users, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { PatientChat } from "@/components/medicore/patient-chat";
import { AppHeader, SectionHeading, StatCard } from "@/components/medicore/shared";

export const Route = createFileRoute("/medico")({
  head: () => ({
    meta: [
      { title: "Agenda médica — MediCore OS" },
      {
        name: "description",
        content: "Agenda clínica y copiloto visual para profesionales médicos.",
      },
      { property: "og:title", content: "Agenda médica — MediCore OS" },
      { property: "og:description", content: "Panel visual de agenda diaria para médicos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorPage,
});

function DoctorPage() {
  const rows = [
    ["08:00", "Carlos Ramírez", "Control cardiológico", "Confirmada", "Presencial"],
    ["09:30", "Valentina Soto", "Primera consulta", "En espera", "Virtual"],
    ["11:00", "Miguel Torres", "Lectura de resultados", "Confirmada", "Presencial"],
    ["14:30", "Ana Lucía Gómez", "Seguimiento", "Pendiente", "Virtual"],
  ];
  return (
    <DashboardShell>
      <AppHeader
        title="Agenda clínica"
        subtitle="Viernes, 18 de septiembre"
        name="Dra. M. Ruiz"
        initials="MR"
      />
      <div className="space-y-8 p-5 lg:p-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.65fr)]">
          <PatientChat mode="doctor" className="min-h-[540px]" />
          <div className="grid content-start gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <StatCard icon={<Clock3 />} label="Próxima consulta" value="08:00" note="en 24 min" />
            <StatCard icon={<Users />} label="Pacientes hoy" value="8" note="2 virtuales" />
            <StatCard icon={<CalendarCheck />} label="Ocupación" value="86%" note="6 h 30 min" />
          </div>
        </section>
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <SectionHeading title="Citas de hoy" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Search />
                Buscar
              </Button>
              <Button size="sm">Nueva cita</Button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  {["Hora", "Paciente", "Motivo", "Estado", "Modalidad", ""].map((head) => (
                    <th key={head} className="px-5 py-3 font-medium">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row[0]} className="bg-card/50 transition-colors hover:bg-accent">
                    <td className="px-5 py-4 font-medium text-primary">{row[0]}</td>
                    <td className="px-5 py-4 font-medium">{row[1]}</td>
                    <td className="px-5 py-4 text-muted-foreground">{row[2]}</td>
                    <td className="px-5 py-4">
                      <span className="flex items-center gap-2">
                        <i
                          className={`size-1.5 rounded-full ${row[3] === "Confirmada" ? "bg-success" : "bg-warning"}`}
                        />
                        {row[3]}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{row[4]}</td>
                    <td className="px-5 py-4">
                      <Button variant="ghost" size="icon" aria-label="Abrir historia">
                        <FileText />
                      </Button>
                      {row[4] === "Virtual" && (
                        <Button variant="ghost" size="icon" aria-label="Iniciar videollamada">
                          <Video />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
