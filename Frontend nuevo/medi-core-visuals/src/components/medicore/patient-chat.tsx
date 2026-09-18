import { ArrowUp, Bot, Paperclip } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, getUser } from "@/lib/api";
import { cn } from "@/lib/utils";

type Message = { id: number; from: "assistant" | "user"; text: string };

const suggestions = ["Ver mi próxima cita", "¿Cómo prepararme?", "Consultar un pago"];

export function PatientChat({ compact = false, className, mode = "patient" }: { compact?: boolean; className?: string; mode?: "patient" | "doctor" }) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (mode === "doctor") {
      return [{ id: 1, from: "assistant", text: "Buenos días, doctor. Puedo ayudarle a preparar consultas, resumir notas y organizar seguimientos. ¿Qué necesita revisar?" }];
    }
    const user = getUser();
    const nombre = user?.nombre_completo ? user.nombre_completo.split(" ")[0] : "estimado paciente";
    return [{ id: 1, from: "assistant", text: `Hola, ${nombre}. Puedo orientarte sobre tus citas, pagos o síntomas generales. ¿En qué te ayudo hoy?` }];
  });
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || loading) return;

    const userMsgId = Date.now();
    setMessages((current) => [
      ...current,
      { id: userMsgId, from: "user", text: clean },
    ]);
    setDraft("");
    setLoading(true);

    try {
      const res = await apiFetch<{
        respuesta: string;
        sesion_id?: string;
        herramientas_usadas?: any[];
      }>("/chat/mensaje", {
        method: "POST",
        body: JSON.stringify({
          mensaje: clean,
          sesion_id: sessionId || undefined,
        }),
      });

      if (res.sesion_id) {
        setSessionId(res.sesion_id);
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          from: "assistant",
          text: res.respuesta || "No recibí respuesta del asistente.",
        },
      ]);
    } catch (err: any) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          from: "assistant",
          text: err.message || "Lo sentimos, ocurrió un error al consultar al asistente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send(draft);
  };
  return (
    <section
      className={cn(
        "flex min-h-[480px] flex-col overflow-hidden rounded-md border border-border bg-card",
        compact ? "min-h-[390px]" : "min-h-[620px]",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
          <Bot className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-base font-semibold">{mode === "doctor" ? "Copiloto clínico" : "Asistente MediCore"}</h2>
          <p className="text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block size-1.5 rounded-full bg-success" />
             {mode === "doctor" ? "Apoyo a la consulta" : "Orientación clínica"}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.from === "user" && "justify-end")}>
            <div
              className={cn(
                "max-w-[84%] text-sm leading-6",
                message.from === "user"
                  ? "rounded-md bg-primary px-4 py-2.5 text-primary-foreground"
                  : "text-foreground",
              )}
            >
              {message.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex">
            <div className="max-w-[84%] text-sm leading-6 text-muted-foreground animate-pulse">
              Consultando asistente...
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>
      <div className="space-y-3 border-t border-border p-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => send(suggestion)}
              disabled={loading}
            >
              {suggestion}
            </Button>
          ))}
        </div>
        <form onSubmit={submit} className="relative">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Escribe tu consulta…"
            className="min-h-20 resize-none pb-11 pr-12"
            disabled={loading}
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <Button type="button" size="icon" variant="ghost" aria-label="Adjuntar archivo" disabled={loading}>
              <Paperclip />
            </Button>
            <Button type="submit" size="icon" aria-label="Enviar consulta" disabled={!draft.trim() || loading}>
              <ArrowUp />
            </Button>
          </div>
        </form>
        <p className="text-center text-[11px] text-muted-foreground">
          Este asistente no reemplaza una consulta médica.
        </p>
      </div>
    </section>
  );
}
