import { ArrowUp, Bot, Paperclip } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Message = { id: number; from: "assistant" | "user"; text: string };
const initial: Message[] = [
  {
    id: 1,
    from: "assistant",
    text: "Hola, Laura. Puedo orientarte sobre tus citas, pagos o síntomas generales. ¿En qué te ayudo hoy?",
  },
];
const suggestions = ["Ver mi próxima cita", "¿Cómo prepararme?", "Consultar un pago"];

export function PatientChat({ compact = false, className, mode = "patient" }: { compact?: boolean; className?: string; mode?: "patient" | "doctor" }) {
  const [messages, setMessages] = useState<Message[]>(() => mode === "doctor" ? [{ id: 1, from: "assistant", text: "Buenos días, doctora. Puedo ayudarle a preparar consultas, resumir notas y organizar seguimientos. ¿Qué necesita revisar?" }] : initial);
  const [draft, setDraft] = useState("");
  const send = (text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((current) => [
      ...current,
      { id: Date.now(), from: "user", text: clean },
      {
        id: Date.now() + 1,
        from: "assistant",
        text: "Entendido. Esta es una respuesta de demostración; tu integración podrá reemplazarla con la respuesta de Groq.",
      },
    ]);
    setDraft("");
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
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <Button type="button" size="icon" variant="ghost" aria-label="Adjuntar archivo">
              <Paperclip />
            </Button>
            <Button type="submit" size="icon" aria-label="Enviar consulta" disabled={!draft.trim()}>
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
