import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, signOut } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { accountQuotes } from "@/lib/auth/account";
import { Header } from "@/components/header";
import type { QuoteStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minha conta | PEÇA.LAB" };
const statusLabels: Record<QuoteStatus, string> = {
  RECEIVED: "Recebido", UNDER_REVIEW: "Em análise", NEEDS_INFORMATION: "Aguardando informações",
  PROPOSAL_SENT: "Proposta enviada", ACCEPTED: "Aceito", REJECTED: "Recusado",
  EXPIRED: "Expirado", CANCELLED: "Cancelado",
};
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const quotes = await accountQuotes(prisma, user);
  return <><Header/><main id="conteudo" tabIndex={-1} className="container account-page">
    <div className="account-heading"><div><span className="eyebrow">ÁREA DO CLIENTE</span><h1>Olá, {user.name || "cliente"}<span className="accent">.</span></h1><p>{user.email}</p></div>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
        <button className="button button-outline" type="submit">Sair da conta</button>
      </form>
    </div>
    <section className="quote-card"><h2>Seus orçamentos</h2><p className="form-subtitle">Últimas 50 solicitações feitas enquanto você estava conectado. Solicitações feitas como visitante não aparecem nesta lista. Guarde o identificador recebido para referência durante o atendimento.</p>
      {quotes.length ? <ul className="account-quotes">{quotes.map(quote => <li key={quote.id}><div><h3>{quote.partName}</h3><small>{quote.id}</small></div><div><span className="pill">{statusLabels[quote.status]}</span><p>{quote.createdAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></div></li>)}</ul> : <p>Você ainda não tem solicitações vinculadas à sua conta.</p>}
      <Link className="button button-primary" href="/#orcamento">Solicitar uma peça →</Link>
    </section>
  </main></>;
}
