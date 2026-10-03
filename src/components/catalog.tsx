"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { examples } from "@/lib/data";
import { PartArt } from "./part-art";

const filters = ["Todas", "Automotivo", "Sob medida", "Outros nichos"] as const;
type Filter = (typeof filters)[number];

export function Catalog() {
  const [active, setActive] = useState<Filter>("Todas");
  const visible = examples.filter((part) => active === "Todas" || part.category === active);
  return <div className="catalog-inner">
    <div className="catalog-toolbar" role="group" aria-label="Filtrar exemplos por categoria">
      {filters.map((filter) => <button type="button" key={filter} className={`filter ${active === filter ? "active" : ""}`} aria-pressed={active === filter} onClick={() => setActive(filter)}>{filter}</button>)}
    </div>
    <div className="product-grid">
      {visible.map((part, index) => <article key={part.id} className="product-card">
        <div className="product-visual"><span className="product-index">0{index + 1} / EXEMPLO</span><PartArt variant={part.illustration}/><span className="product-corner">↗</span></div>
        <div className="product-body"><span className="product-tag">{part.tag}</span><h3>{part.name}</h3><p>{part.description}</p><a href="#orcamento" className="product-link">Solicitar algo assim <ArrowUpRight size={17}/></a></div>
      </article>)}
    </div>
  </div>;
}
