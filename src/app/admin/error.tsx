"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <main id="conteudo" tabIndex={-1} className="container account-page">
      <section className="quote-card">
        <h1>Atendimento indisponível</h1>
        <p>
          Não foi possível carregar os dados agora. Tente novamente em
          instantes.
        </p>
        <button className="button button-primary" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
