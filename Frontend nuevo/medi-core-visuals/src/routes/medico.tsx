import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Clock3, FileText, Search, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { PatientChat } from "@/components/medicore/patient-chat";
import { AppHeader, SectionHeading, StatCard } from "@/components/medicore/shared";
import { apiFetch, getUser } from "@/lib/api";

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

interface CitaDoctor {
  id: string;
  fecha_hora: string;
  estado: string;
  motivo?: string;
  tipo?: string;
  paciente_nombre?: string;
  sede_nombre?: string;
}

function DoctorPage() {
  const user = getUser();
  const rawName = user?.nombre_completo || "Dr. Médico";
  const initials = rawName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "DR";

  const [citas, setCitas] = useState<CitaDoctor[]>([]);

  useEffect(() => {
    apiFetch<CitaDoctor[]>("/citas/mis-citas")
      .then((data) => {
        if (Array.isArray(data)) {
          setCitas(data);
        }
      })
      .catch(() => {
        // Fallback to initial rows if offline or error
      });
  }, []);

  const defaultRows = [
    ["08:00", "Carlos Ramírez", "Control cardiológico", "Confirmada", "Presencial"],
    ["09:30", "Valentina Soto", "Primera consulta", "En espera", "Virtual"],
    ["11:00", "Miguel Torres", "Lectura de resultados", "Confirmada", "Presencial"],
    ["14:30", "Ana Lucía Gómez", "Seguimiento", "Pendiente", "Virtual"],
  ];

  const rows = citas.length > 0
    ? citas.map((c) => {
        const d = new Date(c.fecha_hora);
        const hora = !isNaN(d.getTime())
          ? d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
          : "08:00";
        const paciente = c.paciente_nombre || "Paciente";
        const motivo = c.motivo || "Consulta médica";
        const estado = c.estado.charAt(0).toUpperCase() + c.estado.slice(1);
        const modalidad = c.tipo === "telemedicina" ? "Virtual" : "Presencial";
        return [hora, paciente, motivo, estado, modalidad];
      })
    : defaultRows;

  const virtualCount = rows.filter((r) => r[4] === "Virtual").length;
  const nextTime = rows[0]?.[0] || "08:00";

  return (
    <DashboardShell>
      <AppHeader
        title="Agenda clínica"
        subtitle="Panel del profesional de salud"
        name={rawName}
        initials={initials}
      />
      <div className="space-y-8 p-5 lg:p-8">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.65fr)]">
          <PatientChat mode="doctor" className="min-h-[540px]" />
          <div className="grid content-start gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <StatCard icon={<Clock3 />} label="Próxima consulta" value={nextTime} note="próximo turno" />
            <StatCard icon={<Users />} label="Pacientes agendados" value={rows.length.toString()} note={`${virtualCount} virtuales`} />
            <StatCard icon={<CalendarCheck />} label="Disponibilidad" value="Activa" note="Horario regular" />
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
                {rows.map((row, idx) => (
                  <tr key={`${row[0]}-${idx}`} className="bg-card/50 transition-colors hover:bg-accent">
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
