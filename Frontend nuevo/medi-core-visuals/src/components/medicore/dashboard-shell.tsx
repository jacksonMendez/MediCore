import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Plus,
  Settings,
  Trash2,
  Users,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Brand, MobileTopbar } from "./shared";
import { apiFetch, removeToken } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatSessionItem {
  id: string;
  titulo?: string;
  ultimo_mensaje?: string;
  creado_en?: string;
}

const nav = [
  { label: "Resumen", icon: LayoutDashboard },
  { label: "Citas", icon: CalendarDays },
  { label: "Directorio", icon: Users },
  { label: "Pagos", icon: CreditCard },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const loadSessions = async () => {
    try {
      const res = await apiFetch<ChatSessionItem[]>("/chat/sesiones");
      if (Array.isArray(res)) {
        setSessions(res);
      }
    } catch {
      // ignore
    }
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiFetch(`/chat/sesiones/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (activeSessionId === id) {
        setActiveSessionId(null);
        window.dispatchEvent(new CustomEvent("medicore:new-chat"));
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSessions();

    const handleSessionCreated = () => {
      loadSessions();
    };

    const handleActiveChanged = (e: any) => {
      setActiveSessionId(e.detail || null);
    };

    window.addEventListener("medicore:chat-session-created", handleSessionCreated);
    window.addEventListener("medicore:active-session-changed", handleActiveChanged);

    return () => {
      window.removeEventListener("medicore:chat-session-created", handleSessionCreated);
      window.removeEventListener("medicore:active-session-changed", handleActiveChanged);
    };
  }, []);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-background text-foreground flex flex-col">
      <MobileTopbar />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-sidebar lg:flex">
        <div className="shrink-0 px-6 py-5">
          <Brand />
        </div>

        {/* Navigation items */}
        <nav className="shrink-0 space-y-1 px-3 pb-2">
          {nav.map(({ label, icon: Icon }, index) => (
            <Button
              key={label}
              variant={index === 0 ? "secondary" : "ghost"}
              className="w-full justify-start cursor-pointer"
            >
              <Icon />
              {label}
            </Button>
          ))}
        </nav>

        {/* Punto 6: Chat History Section */}
        <div className="flex-1 min-h-0 flex flex-col px-3 border-t border-border/60 pt-3">
          <div className="shrink-0 mb-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 border-border/80 bg-background/50 hover:bg-muted text-xs h-8 cursor-pointer font-medium text-foreground"
              onClick={() => {
                setActiveSessionId(null);
                window.dispatchEvent(new CustomEvent("medicore:new-chat"));
              }}
            >
              <Plus className="size-3.5 text-primary" />
              Nuevo chat
            </Button>
          </div>

          <div className="shrink-0 px-2 pt-2 pb-1 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-muted-foreground/70">
            <span>Recientes</span>
            {sessions.length > 0 && (
              <span className="text-[10px] font-normal lowercase opacity-70">({sessions.length})</span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1 py-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "group flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer select-none",
                  activeSessionId === s.id
                    ? "bg-secondary text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
                onClick={() => {
                  setActiveSessionId(s.id);
                  window.dispatchEvent(new CustomEvent("medicore:select-session", { detail: s.id }));
                }}
              >
                <span className="flex items-center gap-2 truncate flex-1 mr-1">
                  <MessageSquare className="size-3 shrink-0 opacity-70" />
                  <span className="truncate">{s.titulo || s.ultimo_mensaje || "Consulta"}</span>
                </span>
                <button
                  type="button"
                  className="opacity-0 group-hover:opacity-100 hover:text-destructive p-0.5 rounded transition-opacity cursor-pointer"
                  title="Eliminar chat"
                  onClick={(e) => deleteSession(s.id, e)}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground/60 italic text-center">
                Sin consultas previas
              </p>
            )}
          </div>
        </div>

        {/* User / Settings Footer */}
        <div className="shrink-0 space-y-1 border-t border-border p-3">
          <Button variant="ghost" className="w-full justify-start cursor-pointer">
            <Settings />
            Configuración
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground cursor-pointer"
            onClick={() => removeToken()}
            asChild
          >
            <Link to="/">
              <LogOut />
              Salir del portal
            </Link>
          </Button>
          <p className="px-3 pt-2 text-[10px] text-muted-foreground">
            Portal: {path.slice(1) || "inicio"}
          </p>
        </div>
      </aside>
      <main className="lg:pl-64 flex-1 flex flex-col min-h-0 lg:overflow-hidden">{children}</main>
    </div>
  );
}

