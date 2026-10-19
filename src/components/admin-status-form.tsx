"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function AdminStatusForm({
  id,
  expectedUpdatedAt,
  options,
}: {
  id: string;
  expectedUpdatedAt: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  if (!options.length)
    return (
      <p className="admin-empty">
        Não há mudanças manuais disponíveis para este andamento. Propostas e
        contratação terão um fluxo próprio.
      </p>
    );
  return (
    <form
      className="admin-status-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (sending.current) return;
        sending.current = true;
        setBusy(true);
        setSaved(false);
        setMessage("");
        const form = new FormData(event.currentTarget);
        try {
          const response = await fetch(
            `/api/admin/quotes/${encodeURIComponent(id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: form.get("status"),
                note: form.get("note"),
                expectedUpdatedAt,
              }),
            },
          );
          const data = await response.json();
          if (!response.ok) {
            setMessage(data.error || "Não foi possível atualizar.");
            return;
          }
          setSaved(true);
          setMessage("Andamento atualizado.");
          router.refresh();
        } catch {
          setMessage(
            "Falha de conexão. Atualize a página para conferir o andamento antes de tentar novamente.",
          );
        } finally {
          sending.current = false;
          setBusy(false);
        }
      }}
    >
      <label>
        Novo andamento
        <select name="status" required disabled={busy || saved}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Observação interna
        <textarea
          name="note"
          required
          minLength={3}
          maxLength={1000}
          rows={5}
          disabled={busy || saved}
          placeholder="Registre o motivo ou o próximo passo do atendimento."
        />
      </label>
      <p className="form-subtitle">
        Não registre senhas, dados de cartão ou outras informações sensíveis.
      </p>
      {message && <p role={saved ? "status" : "alert"}>{message}</p>}
      <button
        className="button button-primary"
        type="submit"
        disabled={busy || saved}
      >
        {busy ? "Salvando…" : "Salvar andamento"}
      </button>
      <button
        className="button button-outline"
        type="button"
        disabled={busy}
        onClick={() => router.refresh()}
      >
        Atualizar dados
      </button>
    </form>
  );
}
