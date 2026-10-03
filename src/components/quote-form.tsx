"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Clipboard, MessageCircle, ShieldCheck } from "lucide-react";

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

const blank: Quote = { name: "", email: "", phone: "", category: "", part: "", car: "", quantity: "1", detail: "" };
const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");

export function QuoteForm() {
  const [quote, setQuote] = useState<Quote>(blank);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof Quote>(key: K, value: Quote[K]) {
    setQuote((current) => ({ ...current, [key]: value }));
    setSummary("");
    setCopied(false);
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote.name.trim() || !quote.email.trim() || !quote.phone.trim() || !quote.category || !quote.part.trim() || !quote.detail.trim()) {
      setError("Preencha os campos obrigatórios para montar seu pedido.");
      return;
    }
    const lines = [
      "Olá! Gostaria de solicitar um orçamento para uma peça sob encomenda.",
      `Nome: ${quote.name.trim()}`,
      `E-mail: ${quote.email.trim()}`,
      `WhatsApp: ${quote.phone.trim()}`,
      `Categoria: ${quote.category}`,
      `Peça: ${quote.part.trim()}`,
      ...(quote.car.trim() ? [`Veículo/aplicação: ${quote.car.trim()}`] : []),
      `Quantidade: ${quote.quantity}`,
      `Detalhes: ${quote.detail.trim()}`,
      "Aguardo instruções sobre referências, medidas e disponibilidade de fabricação.",
    ];
    setSummary(lines.join("\n"));
    setCopied(false);
    setError("");
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setError("");
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione e copie a mensagem abaixo.");
    }
  }

  return (
    <div className="quote-layout" id="orcamento">
      <div className="quote-intro">
        <span className="eyebrow"><span className="eyebrow-line" /> SEU PROJETO COMEÇA AQUI</span>
        <h2>Não encontrou?<br /><span className="accent">Vamos conversar.</span></h2>
        <p>Conte o que você precisa. A fabricação, a compatibilidade, o valor e o prazo serão avaliados caso a caso.</p>
        <div className="quote-steps">
          <div><span>01</span><div><strong>Descreva sua peça</strong><p>Compartilhe o máximo de detalhes que tiver.</p></div></div>
          <div><span>02</span><div><strong>Envie seu pedido</strong><p>Copie a mensagem ou envie pelo WhatsApp comercial.</p></div></div>
          <div><span>03</span><div><strong>Receba uma avaliação</strong><p>A equipe poderá pedir fotos, medidas e referências.</p></div></div>
        </div>
        <div className="notice-inline"><ShieldCheck size={17} /><span>Nesta primeira versão, o formulário prepara a mensagem no seu navegador e não salva os dados em um servidor.</span></div>
      </div>
      <div className="quote-card">
        <div className="form-topline"><span className="pill pill-dark">FORMULÁRIO DE ORÇAMENTO</span><span>ETAPA 01 / 01</span></div>
        <h3>Fale sobre a sua peça</h3>
        <p className="form-subtitle">Preencha os campos e gere uma mensagem pronta para envio.</p>
        <form onSubmit={submit} className="quote-form">
          <div className="field-grid">
            <label>Seu nome <span>*</span><input autoComplete="name" maxLength={100} required name="name" value={quote.name} onChange={(e) => update("name", e.target.value)} placeholder="Como podemos chamar você?" /></label>
            <label>E-mail <span>*</span><input autoComplete="email" type="email" maxLength={180} required name="email" value={quote.email} onChange={(e) => update("email", e.target.value)} placeholder="voce@exemplo.com" /></label>
            <label>WhatsApp <span>*</span><input autoComplete="tel" type="tel" maxLength={24} required name="phone" value={quote.phone} onChange={(e) => update("phone", e.target.value)} placeholder="(11) 99999-9999" /></label>
            <label>Categoria <span>*</span><select required name="category" value={quote.category} onChange={(e) => update("category", e.target.value)}><option value="">Selecione uma opção</option><option>Automotivo</option><option>Peça sob medida</option><option>Outros nichos</option></select></label>
          </div>
          <label>Nome da peça <span>*</span><input required maxLength={150} name="part" value={quote.part} onChange={(e) => update("part", e.target.value)} placeholder="Ex.: Moldura do painel" /></label>
          <div className="field-grid uneven"><label>Veículo ou aplicação <span className="optional">Opcional</span><input name="car" maxLength={160} value={quote.car} onChange={(e) => update("car", e.target.value)} placeholder="Ex.: Fusca, ano e modelo" /></label><label>Quantidade<input name="quantity" required type="number" min="1" max="9999" value={quote.quantity} onChange={(e) => update("quantity", e.target.value)} /></label></div>
          <label>Descreva seu projeto <span>*</span><textarea required minLength={10} maxLength={1600} rows={4} name="detail" value={quote.detail} onChange={(e) => update("detail", e.target.value)} placeholder="Explique medidas, material desejado, encaixes e qualquer detalhe importante..." /></label>
          <p className="microcopy">Fotos e desenhos técnicos poderão ser solicitados durante o atendimento.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button button-primary submit-btn" type="submit">Preparar meu pedido <ArrowRight size={17}/></button>
        </form>
        {summary && <div className="summary-box" role="status" aria-live="polite">
          <div className="summary-title"><Check size={18} /><strong>Mensagem pronta para envio</strong></div>
          <p>Seu pedido ainda não foi enviado nem armazenado. Confira o texto e escolha como compartilhar.</p>
          <textarea className="summary-text" readOnly aria-label="Mensagem de orçamento pronta" value={summary} rows={9} onFocus={(event) => event.currentTarget.select()} />
          <div className="summary-actions">
            <button type="button" onClick={copySummary} className="button button-outline"><Clipboard size={16}/>{copied ? "Copiado!" : "Copiar mensagem"}</button>
            {whatsapp && <a className="button button-primary" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/> Enviar no WhatsApp</a>}
          </div>
          {!whatsapp && <p className="microcopy">O número comercial ainda não está configurado. Copie a mensagem e envie pelo canal de atendimento de sua preferência.</p>}
        </div>}
      </div>
    </div>
  );
}
