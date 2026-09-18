import { createFileRoute } from "@tanstack/react-router";
import { Building2, MoreHorizontal, Plus, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { AppHeader, SearchBox, StatCard } from "@/components/medicore/shared";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administración clínica — MediCore OS" },
      { name: "description", content: "Gestión visual de médicos, sedes y especialidades." },
      { property: "og:title", content: "Administración clínica — MediCore OS" },
      { property: "og:description", content: "Panel administrativo visual de MediCore OS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

const doctors = [
  ["María F. Ruiz", "Cardiología", "Sede Norte", "Activa"],
  ["Julián Pardo", "Dermatología", "Sede Centro", "Activo"],
  ["Camila Ríos", "Pediatría", "Sede Norte", "Activa"],
  ["Andrés Peña", "Medicina general", "Sede Sur", "Inactivo"],
];
const branches = [
  ["Sede Norte", "Calle 127 # 18-20", "14 consultorios", "Activa"],
  ["Sede Centro", "Carrera 7 # 32-16", "9 consultorios", "Activa"],
  ["Sede Sur", "Avenida 1 de Mayo # 42-30", "7 consultorios", "Activa"],
];
const specialties = [
  ["Cardiología", "8 médicos", "42 citas esta semana", "Activa"],
  ["Dermatología", "5 médicos", "31 citas esta semana", "Activa"],
  ["Pediatría", "7 médicos", "38 citas esta semana", "Activa"],
  ["Medicina general", "12 médicos", "96 citas esta semana", "Activa"],
];

function DataTable({ rows, headers }: { rows: string[][]; headers: string[] }) {
  return (
    <div className="mt-5 overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="bg-surface-muted text-xs text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-5 py-3 font-medium">
                {header}
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row[0]} className="bg-card/50 hover:bg-accent">
              {row.map((cell, i) => (
                <td
                  key={cell}
                  className={`px-5 py-4 ${i === 0 ? "font-medium" : "text-muted-foreground"}`}
                >
                  {i === row.length - 1 ? (
                    <span className="flex items-center gap-2">
                      <i
                        className={`size-1.5 rounded-full ${cell === "Inactivo" ? "bg-destructive" : "bg-success"}`}
                      />
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
              <td className="px-5">
                <Button variant="ghost" size="icon" aria-label={`Opciones de ${row[0]}`}>
                  <MoreHorizontal />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminPage() {
  return (
    <DashboardShell>
      <AppHeader
        title="Administración"
        subtitle="Gestión de la red clínica"
        name="Sofía Vargas"
        initials="SV"
      />
      <div className="space-y-8 p-5 lg:p-8">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard icon={<Users />} label="Médicos activos" value="32" note="3 sedes" />
          <StatCard icon={<Building2 />} label="Sedes" value="3" note="30 consultorios" />
          <StatCard icon={<Stethoscope />} label="Especialidades" value="12" note="4 destacadas" />
        </section>
        <Tabs defaultValue="doctors">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="doctors">Médicos</TabsTrigger>
              <TabsTrigger value="branches">Sedes</TabsTrigger>
              <TabsTrigger value="specialties">Especialidades</TabsTrigger>
            </TabsList>
            <Button>
              <Plus />
              Agregar registro
            </Button>
          </div>
          <div className="mt-6 max-w-sm">
            <SearchBox placeholder="Buscar en registros..." />
          </div>
          <TabsContent value="doctors">
            <DataTable rows={doctors} headers={["Profesional", "Especialidad", "Sede", "Estado"]} />
          </TabsContent>
          <TabsContent value="branches">
            <DataTable rows={branches} headers={["Sede", "Dirección", "Capacidad", "Estado"]} />
          </TabsContent>
          <TabsContent value="specialties">
            <DataTable
              rows={specialties}
              headers={["Especialidad", "Equipo", "Actividad", "Estado"]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
