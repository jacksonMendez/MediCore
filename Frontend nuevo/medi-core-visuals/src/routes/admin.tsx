import { createFileRoute } from "@tanstack/react-router";
import { Building2, MoreHorizontal, Plus, Stethoscope, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardShell } from "@/components/medicore/dashboard-shell";
import { AppHeader, SearchBox, StatCard } from "@/components/medicore/shared";
import { apiFetch, getUser } from "@/lib/api";

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

const defaultDoctors = [
  ["Dra. María F. Ruiz", "Cardiología", "Sede Norte", "Activa"],
  ["Dr. Julián Pardo", "Dermatología", "Sede Centro", "Activo"],
  ["Dra. Camila Ríos", "Pediatría", "Sede Norte", "Activa"],
  ["Dr. Andrés Peña", "Medicina General", "Sede Principal", "Activo"],
];
const defaultBranches = [
  ["Sede Norte", "Calle 127 # 18-20", "14 consultorios", "Activa"],
  ["Sede Centro", "Carrera 7 # 32-16", "9 consultorios", "Activa"],
];
const defaultSpecialties = [
  ["Cardiología", "1 médico", "$150.000 tarifa base", "Activa"],
  ["Dermatología", "1 médico", "$130.000 tarifa base", "Activa"],
  ["Pediatría", "1 médico", "$120.000 tarifa base", "Activa"],
  ["Medicina General", "1 médico", "$90.000 tarifa base", "Activa"],
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
          {rows.map((row, idx) => (
            <tr key={`${row[0]}-${idx}`} className="bg-card/50 hover:bg-accent">
              {row.map((cell, i) => (
                <td
                  key={cell}
                  className={`px-5 py-4 ${i === 0 ? "font-medium" : "text-muted-foreground"}`}
                >
                  {i === row.length - 1 ? (
                    <span className="flex items-center gap-2">
                      <i
                        className={`size-1.5 rounded-full ${cell === "Inactivo" || cell === "Inactiva" ? "bg-destructive" : "bg-success"}`}
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

interface DoctorRes {
  id: string;
  nombre_completo: string;
  especialidad_nombre?: string;
  sede_nombre?: string;
  activo?: boolean;
}

interface SedeRes {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  activa?: boolean;
}

interface EspecialidadRes {
  id: string;
  nombre: string;
  precio_base?: number;
}

function AdminPage() {
  const user = getUser();
  const rawName = user?.nombre_completo || "Administrador";
  const initials = rawName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "AD";

  const [doctorsList, setDoctorsList] = useState<string[][]>(defaultDoctors);
  const [branchesList, setBranchesList] = useState<string[][]>(defaultBranches);
  const [specialtiesList, setSpecialtiesList] = useState<string[][]>(defaultSpecialties);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    Promise.allSettled([
      apiFetch<DoctorRes[]>("/medicos"),
      apiFetch<SedeRes[]>("/sedes"),
      apiFetch<EspecialidadRes[]>("/especialidades"),
    ]).then(([docs, seds, esps]) => {
      if (docs.status === "fulfilled" && Array.isArray(docs.value) && docs.value.length > 0) {
        setDoctorsList(
          docs.value.map((d) => [
            d.nombre_completo,
            d.especialidad_nombre || "General",
            d.sede_nombre || "Sede Principal",
            d.activo !== false ? "Activo" : "Inactivo",
          ])
        );
      }
      if (seds.status === "fulfilled" && Array.isArray(seds.value) && seds.value.length > 0) {
        setBranchesList(
          seds.value.map((s) => [
            s.nombre,
            s.direccion || "Bogotá D.C.",
            s.telefono || "PBX: 601 555-0100",
            s.activa !== false ? "Activa" : "Inactiva",
          ])
        );
      }
      if (esps.status === "fulfilled" && Array.isArray(esps.value) && esps.value.length > 0) {
        setSpecialtiesList(
          esps.value.map((e) => [
            e.nombre,
            "1 especialista",
            e.precio_base ? `$${e.precio_base.toLocaleString("es-CO")} tarifa base` : "$120.000 tarifa base",
            "Activa",
          ])
        );
      }
    });
  }, []);

  const filterRows = (rows: string[][]) => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
  };

  return (
    <DashboardShell>
      <AppHeader
        title="Administración"
        subtitle="Gestión integral de la red clínica"
        name={rawName}
        initials={initials}
      />
      <div className="space-y-8 p-5 lg:p-8">
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            icon={<Users />}
            label="Médicos registrados"
            value={doctorsList.length.toString()}
            note={`${branchesList.length} sedes`}
          />
          <StatCard
            icon={<Building2 />}
            label="Sedes habilitadas"
            value={branchesList.length.toString()}
            note="Red activa"
          />
          <StatCard
            icon={<Stethoscope />}
            label="Especialidades clínicas"
            value={specialtiesList.length.toString()}
            note="Tarifas configuradas"
          />
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
            <SearchBox
              placeholder="Buscar en registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <TabsContent value="doctors">
            <DataTable rows={filterRows(doctorsList)} headers={["Profesional", "Especialidad", "Sede", "Estado"]} />
          </TabsContent>
          <TabsContent value="branches">
            <DataTable rows={filterRows(branchesList)} headers={["Sede", "Dirección", "Capacidad / Contacto", "Estado"]} />
          </TabsContent>
          <TabsContent value="specialties">
            <DataTable
              rows={filterRows(specialtiesList)}
              headers={["Especialidad", "Equipo", "Tarifa base", "Estado"]}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardShell>
  );
}
