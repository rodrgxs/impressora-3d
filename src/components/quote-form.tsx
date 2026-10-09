"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Clipboard,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

type Quote = {
  name: string;
  email: string;
  phone: string;
  category: string;
  part: string;
  car: string;
  quantity: string;
  detail: string;
};

type SubmissionStatus = "idle" | "submitting" | "success" | "error";

const blank: Quote = {
  name: "",
  email: "",
  phone: "",
  category: "",
  part: "",
  car: "",
  quantity: "1",
  detail: "",
};
const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(
  /\D/g,
  "",
);

function makeSummary(quote: Quote, id: string) {
  return [
    "Olá! Gostaria de conversar sobre a solicitação de orçamento registrada.",
    `Identificador: ${id}`,
    `Nome: ${quote.name.trim()}`,
    `E-mail: ${quote.email.trim()}`,
    `WhatsApp: ${quote.phone.trim()}`,
    `Categoria: ${quote.category}`,
    `Peça: ${quote.part.trim()}`,
    ...(quote.car.trim() ? [`Veículo/aplicação: ${quote.car.trim()}`] : []),
    `Quantidade: ${quote.quantity}`,
    `Detalhes: ${quote.detail.trim()}`,
  ].join("\n");
}

export function QuoteForm() {
  const [quote, setQuote] = useState<Quote>(blank);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("idle");
  const [requestId, setRequestId] = useState("");
  const sending = useRef(false);
  const submissionKey = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const fieldName = (key: keyof Quote) =>
    key === "car" ? "application" : key === "detail" ? "description" : key;
  function attributes(key: keyof Quote) {
    const field = fieldName(key);
    return {
      id: `quote-${key}`,
      "aria-invalid": Boolean(fields[field]),
      "aria-describedby": fields[field] ? `error-${key}` : undefined,
    };
  }
  function fieldError(key: keyof Quote) {
    const message = fields[fieldName(key)];
    return message ? (
      <small className="field-error" id={`error-${key}`}>
        {message}
      </small>
    ) : null;
  }
  function showErrors(next: Record<string, string>) {
    setFields(next);
  }
  const isSubmitting = status === "submitting";
  useEffect(() => {
    if (isSubmitting) return;
    const first = Object.keys(fields)[0];
    const name =
      first === "application"
        ? "car"
        : first === "description"
          ? "detail"
          : first;
    const control = formRef.current?.elements.namedItem(name);
    if (control instanceof HTMLElement) control.focus();
  }, [fields, isSubmitting]);

  function update<K extends keyof Quote>(key: K, value: Quote[K]) {
    submissionKey.current = null;
    setFields({});
    setQuote((current) => ({ ...current, [key]: value }));
    setSummary("");
    setCopied(false);
    setError("");
    setRequestId("");
    setStatus("idle");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setStatus("submitting");
    setError("");
    setFields({});
    try {
      const { quoteFieldErrors, quoteRequestSchema } =
        await import("@/lib/quotes/validation");
      const payload = {
        name: quote.name,
        email: quote.email,
        phone: quote.phone,
        category: quote.category,
        part: quote.part,
        application: quote.car,
        quantity: Number(quote.quantity),
        description: quote.detail,
      };
      const parsed = quoteRequestSchema.safeParse(payload);
      if (!parsed.success) {
        showErrors(quoteFieldErrors(parsed.error.issues));
        setError("Confira os campos indicados abaixo.");
        setStatus("error");
        return;
      }
      submissionKey.current ??= crypto.randomUUID();
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submissionKey.current,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result: unknown = await response.json().catch(() => null);
        if (
          result &&
          typeof result === "object" &&
          "fields" in result &&
          result.fields &&
          typeof result.fields === "object"
        ) {
          showErrors(
            Object.fromEntries(
              Object.entries(result.fields).filter(
                (entry): entry is [string, string] =>
                  typeof entry[1] === "string",
              ),
            ),
          );
        }
        if (response.status === 409) submissionKey.current = null;
        setError(
          response.status === 429
            ? "Você enviou várias solicitações em pouco tempo. Aguarde alguns minutos e tente novamente."
            : response.status === 400
              ? "Confira os campos preenchidos e tente novamente."
              : "Não foi possível registrar sua solicitação agora. Tente novamente mais tarde.",
        );
        setStatus("error");
        return;
      }

      const result: unknown = await response.json();
      if (
        typeof result !== "object" ||
        result === null ||
        !("id" in result) ||
        typeof result.id !== "string"
      ) {
        throw new Error("Invalid response");
      }

      setRequestId(result.id);
      setSummary(makeSummary(quote, result.id));
      setCopied(false);
      submissionKey.current = null;
      setQuote(blank);
      setStatus("success");
    } catch {
      setError(
        "Não foi possível registrar sua solicitação agora. Verifique sua conexão e tente novamente.",
      );
      setStatus("error");
    } finally {
      sending.current = false;
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setError("");
    } catch {
      setError(
        "Não foi possível copiar automaticamente. Selecione e copie a mensagem abaixo.",
      );
    }
  }

  return (
    <div className="quote-layout" id="orcamento">
      <div className="quote-intro">
        <span className="eyebrow">
          <span className="eyebrow-line" /> SEU PROJETO COMEÇA AQUI
        </span>
        <h2>
          Não encontrou?
          <br />
          <span className="accent">Vamos conversar.</span>
        </h2>
        <p>
          Conte o que você precisa. A fabricação, a compatibilidade, o valor e o
          prazo serão avaliados caso a caso.
        </p>
        <div className="quote-steps">
          <div>
            <span>01</span>
            <div>
              <strong>Descreva sua peça</strong>
              <p>Compartilhe o máximo de detalhes que tiver.</p>
            </div>
          </div>
          <div>
            <span>02</span>
            <div>
              <strong>Registre sua solicitação</strong>
              <p>Envie o formulário para iniciar sua avaliação.</p>
            </div>
          </div>
          <div>
            <span>03</span>
            <div>
              <strong>Receba uma avaliação</strong>
              <p>A equipe poderá pedir fotos, medidas e referências.</p>
            </div>
          </div>
        </div>
        <div className="notice-inline">
          <ShieldCheck size={17} />
          <span>
            Seus dados serão enviados com segurança para registrar a solicitação
            de orçamento.
          </span>
        </div>
      </div>
      <div className="quote-card">
        <div className="form-topline">
          <span className="pill pill-dark">FORMULÁRIO DE ORÇAMENTO</span>
          <span>ETAPA 01 / 01</span>
        </div>
        <h3>Fale sobre a sua peça</h3>
        <p className="form-subtitle">
          Campos com * são obrigatórios. O envio solicita uma avaliação, sem
          compromisso de fabricação.
        </p>
        {status !== "success" && (
          <form
            ref={formRef}
            onSubmit={submit}
            className="quote-form"
            aria-busy={isSubmitting}
            noValidate
          >
            <div className="field-grid">
              <label>
                <span className="field-label">
                  Seu nome <b aria-hidden="true">*</b>
                </span>
                <input
                  minLength={2}
                  autoComplete="name"
                  maxLength={100}
                  required
                  disabled={isSubmitting}
                  name="name"
                  {...attributes("name")}
                  value={quote.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Como podemos chamar você?"
                />
                {fieldError("name")}
              </label>
              <label>
                <span className="field-label">
                  E-mail <b aria-hidden="true">*</b>
                </span>
                <input
                  autoComplete="email"
                  type="email"
                  maxLength={254}
                  required
                  disabled={isSubmitting}
                  name="email"
                  {...attributes("email")}
                  value={quote.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="voce@exemplo.com"
                />
                {fieldError("email")}
              </label>
              <label>
                <span className="field-label">
                  WhatsApp <b aria-hidden="true">*</b>
                </span>
                <input
                  autoComplete="tel"
                  type="tel"
                  maxLength={24}
                  required
                  disabled={isSubmitting}
                  name="phone"
                  {...attributes("phone")}
                  value={quote.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                />
                {fieldError("phone")}
              </label>
              <label>
                <span className="field-label">
                  Categoria <b aria-hidden="true">*</b>
                </span>
                <select
                  required
                  disabled={isSubmitting}
                  name="category"
                  {...attributes("category")}
                  value={quote.category}
                  onChange={(e) => update("category", e.target.value)}
                >
                  <option value="">Selecione uma opção</option>
                  <option>Automotivo</option>
                  <option>Peça sob medida</option>
                  <option>Outros nichos</option>
                </select>
                {fieldError("category")}
              </label>
            </div>
            <label>
              <span className="field-label">
                Nome da peça <b aria-hidden="true">*</b>
              </span>
              <input
                minLength={2}
                required
                disabled={isSubmitting}
                maxLength={150}
                name="part"
                {...attributes("part")}
                value={quote.part}
                onChange={(e) => update("part", e.target.value)}
                placeholder="Ex.: Moldura do painel"
              />
              {fieldError("part")}
            </label>
            <div className="field-grid uneven">
              <label>
                <span className="field-label">
                  Veículo ou aplicação{" "}
                  <small className="optional">Opcional</small>
                </span>
                <input
                  disabled={isSubmitting}
                  name="car"
                  {...attributes("car")}
                  maxLength={160}
                  value={quote.car}
                  onChange={(e) => update("car", e.target.value)}
                  placeholder="Ex.: Fusca, ano e modelo"
                />
                {fieldError("car")}
              </label>
              <label>
                Quantidade
                <input
                  disabled={isSubmitting}
                  name="quantity"
                  {...attributes("quantity")}
                  required
                  type="number"
                  min="1"
                  max="9999"
                  step="1"
                  value={quote.quantity}
                  onChange={(e) => update("quantity", e.target.value)}
                />
                {fieldError("quantity")}
              </label>
            </div>
            <label>
              <span className="field-label">
                Descreva seu projeto <b aria-hidden="true">*</b>
              </span>
              <textarea
                disabled={isSubmitting}
                required
                minLength={10}
                maxLength={1600}
                rows={4}
                name="detail"
                {...attributes("detail")}
                value={quote.detail}
                onChange={(e) => update("detail", e.target.value)}
                placeholder="Explique medidas, material desejado, encaixes e qualquer detalhe importante..."
              />
              {fieldError("detail")}
            </label>
            <p className="microcopy">
              Fotos e desenhos técnicos poderão ser solicitados durante o
              atendimento.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="button button-primary submit-btn"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Enviando solicitação..."
                : "Registrar meu orçamento"}{" "}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
        {status === "success" && (
          <div className="summary-box" role="status" aria-live="polite">
            <div className="summary-title">
              <Check size={18} />
              <strong>Solicitação registrada com sucesso</strong>
            </div>
            <p>
              Seu identificador de solicitação é <strong>{requestId}</strong>.
              Guarde-o para referência. Você também pode compartilhar os
              detalhes pelo WhatsApp.
            </p>
            {summary && (
              <textarea
                className="summary-text"
                readOnly
                aria-label="Resumo da solicitação registrada"
                value={summary}
                rows={9}
                onFocus={(event) => event.currentTarget.select()}
              />
            )}
            <div className="summary-actions">
              <button
                type="button"
                onClick={copySummary}
                className="button button-outline"
              >
                <Clipboard size={16} />
                {copied ? "Copiado!" : "Copiar resumo"}
              </button>
              {whatsapp && (
                <a
                  className="button button-primary"
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(summary)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> Enviar no WhatsApp
                </a>
              )}
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              className="button button-outline"
              onClick={() => {
                setSummary("");
                setRequestId("");
                setError("");
                setStatus("idle");
              }}
            >
              Iniciar outro orçamento
            </button>
            {!whatsapp && (
              <p className="microcopy">
                O número comercial ainda não está configurado. O registro da
                solicitação já foi concluído.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
