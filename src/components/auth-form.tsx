"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get("email") || "");
    const password = String(fields.get("password") || "");
    setPending(true);
    setError("");
    setMessage("");
    try {
      if (register) {
        const response = await fetch("/api/auth/register", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fields.get("name"), email, password }),
        });
        const result = await response.json();
        if (!response.ok) { setError(result.error || "Não foi possível concluir agora."); return; }
        setMessage(result.message);
        form.reset();
      } else {
        const result = await signIn("credentials", { email, password, redirect: false, redirectTo: "/conta" });
        if (!result || result.error || !result.ok) {
          setError("Não foi possível entrar. Confira e-mail e senha ou aguarde antes de tentar novamente.");
          return;
        }
        router.replace("/conta");
        router.refresh();
      }
    } catch {
      setError("Não foi possível concluir agora. Tente novamente mais tarde.");
    } finally { setPending(false); }
  }

  return <div className="quote-card auth-card">
    <span className="eyebrow">ÁREA DO CLIENTE</span>
    <h1>{register ? "Crie sua conta" : "Entre na sua conta"}<span className="accent">.</span></h1>
    <p className="form-subtitle">{register ? "Organize suas próximas solicitações em um só lugar." : "Acompanhe os orçamentos enviados enquanto estiver conectado."}</p>
    <form className="quote-form" onSubmit={submit} aria-busy={pending}>
      {register && <label>Nome<input name="name" autoComplete="name" minLength={2} maxLength={100} required disabled={pending}/></label>}
      <label>E-mail<input name="email" type="email" autoComplete="email" maxLength={254} required disabled={pending}/></label>
      <label>Senha<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={12} maxLength={128} required disabled={pending}/></label>
      {register && <p className="microcopy">Use de 12 a 128 caracteres. Prefira uma frase longa e exclusiva.</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="auth-message" role="status">{message} <Link href="/login">Ir para login →</Link></p>}
      <button className="button button-primary" disabled={pending} type="submit">{pending ? "Aguarde..." : register ? "Criar conta" : "Entrar"}</button>
    </form>
    <p className="auth-links">{register ? "Já tem uma conta?" : "Primeira vez aqui?"} <Link href={register ? "/login" : "/cadastro"}>{register ? "Entrar" : "Criar conta"}</Link></p>
    <Link className="underlined-link" href="/#orcamento">Solicitar orçamento como visitante →</Link>
  </div>;
}
