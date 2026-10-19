import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth";
import { Header } from "@/components/header";
import { prisma } from "@/lib/db/prisma";
import { listAdminQuotes, statusLabels } from "@/lib/admin/quotes";
export const dynamic = "force-dynamic";
export const metadata = { title: "Atendimento | PEÇA.LAB" };
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/conta");
  const params = await searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;
  const result = await listAdminQuotes(prisma, user, {
    q: one("q"),
    status: one("status"),
    page: one("page"),
  });
  const href = (page: number) =>
    `/admin?${new URLSearchParams({ q: result.q, status: result.status || "", page: String(page) })}`;
  return (
    <>
      <Header />
      <main
        id="conteudo"
        tabIndex={-1}
        className="container account-page admin-page"
      >
        <div className="account-heading">
          <div>
            <span className="eyebrow">ATENDIMENTO · PEÇA.LAB</span>
            <h1>
              Central de orçamentos<span className="accent">.</span>
            </h1>
            <p>Acompanhe cada solicitação, da chegada à análise.</p>
          </div>
          <Link className="button button-outline" href="/conta">
            Minha conta
          </Link>
        </div>
        <section className="admin-summary" aria-label="Resumo da consulta">
          <strong>{result.total}</strong>
          <span>solicitações na consulta</span>
          <span className="pill">25 por página</span>
        </section>
        <form className="admin-filters" method="get">
          <label>
            Buscar solicitação
            <input
              name="q"
              defaultValue={result.q}
              maxLength={100}
              placeholder="Peça, cliente ou protocolo completo"
            />
          </label>
          <label>
            Andamento
            <select name="status" defaultValue={result.status || ""}>
              <option value="">Todos os andamentos</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-primary" type="submit">
            Filtrar
          </button>
          <Link href="/admin" className="button button-outline">
            Limpar
          </Link>
        </form>
        {result.rows.length ? (
          <ul className="admin-list">
            {result.rows.map((q) => (
              <li key={q.id}>
                <Link href={`/admin/orcamentos/${q.id}`}>
                  <div className="admin-item-main">
                    <span className="pill">{statusLabels[q.status]}</span>
                    <h2>{q.partName}</h2>
                    <p>
                      {q.customerName} · {q.quantity} unidade(s)
                    </p>
                    <small>{q.id}</small>
                  </div>
                  <div className="admin-item-side">
                    <time dateTime={q.createdAt.toISOString()}>
                      {q.createdAt.toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })}
                    </time>
                    <span>Ver solicitação →</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <section className="quote-card admin-empty">
            <h2>Nenhuma solicitação encontrada</h2>
            <p>
              Novos orçamentos aparecerão aqui. Se você aplicou filtros, tente
              ampliá-los.
            </p>
          </section>
        )}
        <nav aria-label="Paginação de orçamentos" className="admin-pagination">
          {result.page > 1 && (
            <Link
              className="button button-outline"
              href={href(result.page - 1)}
            >
              Anterior
            </Link>
          )}
          <span>
            Página {result.page} de {Math.max(1, Math.ceil(result.total / 25))}
          </span>
          {result.page * 25 < result.total && (
            <Link
              className="button button-outline"
              href={href(result.page + 1)}
            >
              Próxima
            </Link>
          )}
        </nav>
      </main>
    </>
  );
}
