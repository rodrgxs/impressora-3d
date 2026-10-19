import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { Header } from "@/components/header";
import { AdminStatusForm } from "@/components/admin-status-form";
import { prisma } from "@/lib/db/prisma";
import { adminQuote, statusLabels, transitions } from "@/lib/admin/quotes";
import type { QuoteStatus } from "@prisma/client";
export const dynamic = "force-dynamic";
export const metadata = { title: "Solicitação | PEÇA.LAB" };
const date = (value: Date) =>
  value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
export default async function QuoteDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/conta");
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) notFound();
  const quote = await adminQuote(prisma, user, id);
  if (!quote) notFound();
  return (
    <>
      <Header />
      <main
        id="conteudo"
        tabIndex={-1}
        className="container account-page admin-page"
      >
        <Link className="admin-back" href="/admin">
          ← Todos os orçamentos
        </Link>
        <div className="account-heading">
          <div>
            <span className="eyebrow">SOLICITAÇÃO</span>
            <h1>{quote.partName}</h1>
            <p className="admin-protocol">{quote.id}</p>
          </div>
          <span className="pill">{statusLabels[quote.status]}</span>
        </div>
        <div className="admin-detail-grid">
          <section className="quote-card">
            <h2>Detalhes da peça</h2>
            <dl className="admin-facts">
              <div>
                <dt>Cliente</dt>
                <dd>{quote.customerName}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{quote.customerEmail}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{quote.customerPhone}</dd>
              </div>
              <div>
                <dt>Quantidade</dt>
                <dd>{quote.quantity}</dd>
              </div>
              <div>
                <dt>Aplicação</dt>
                <dd>{quote.application || "Não informada"}</dd>
              </div>
              <div>
                <dt>Recebido em</dt>
                <dd>{date(quote.createdAt)}</dd>
              </div>
            </dl>
            <h3>Descrição enviada</h3>
            <p className="admin-description">{quote.description}</p>
          </section>
          <section className="quote-card">
            <h2>Atualizar andamento</h2>
            <p className="form-subtitle">
              A mudança aparece na conta do cliente. A observação fica apenas no
              histórico interno.
            </p>
            <AdminStatusForm
              key={quote.updatedAt.toISOString()}
              id={quote.id}
              expectedUpdatedAt={quote.updatedAt.toISOString()}
              options={transitions[quote.status].map((value) => ({
                value,
                label: statusLabels[value],
              }))}
            />
          </section>
        </div>
        <section className="quote-card admin-history">
          <h2>Histórico de atendimento</h2>
          <p className="form-subtitle">
            Últimas 50 alterações. Horários de Brasília.
          </p>
          {quote.statusHistory.length ? (
            <ol>
              {quote.statusHistory.map((event) => (
                <li key={event.id}>
                  <div>
                    <strong>
                      {statusLabels[event.toStatus as QuoteStatus] ||
                        event.toStatus}
                    </strong>
                    <time dateTime={event.createdAt.toISOString()}>
                      {date(event.createdAt)}
                    </time>
                  </div>
                  <p className="admin-description">{event.note}</p>
                  <small>
                    {event.actor?.name || "Administrador"} ·{" "}
                    {event.fromStatus
                      ? statusLabels[event.fromStatus as QuoteStatus] ||
                        event.fromStatus
                      : "Criado"}{" "}
                    →{" "}
                    {statusLabels[event.toStatus as QuoteStatus] ||
                      event.toStatus}
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              O orçamento foi recebido e ainda não teve alterações de andamento.
            </p>
          )}
        </section>
      </main>
    </>
  );
}
