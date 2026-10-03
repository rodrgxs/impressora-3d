"use client";

import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <header className="site-header">
    <div className="container header-inner">
      <a href="#inicio" aria-label="PEÇA.LAB — início" className="brand" onClick={close}><span className="brand-mark">P<span>·</span></span><span>PEÇA<span className="brand-dot">.</span>LAB<small>ESTÚDIO DE PEÇAS • MARCA PROVISÓRIA</small></span></a>
      <nav aria-label="Navegação principal" className={`main-nav ${open ? "open" : ""}`}>
        <a onClick={close} href="#solucoes">O que fazemos</a><a onClick={close} href="#catalogo">Aplicações</a><a onClick={close} href="#processo">Como funciona</a><a onClick={close} href="#sobre">Sobre o projeto</a>
        <a onClick={close} className="mobile-cta" href="#orcamento">Pedir orçamento <ArrowUpRight size={16}/></a>
      </nav>
      <a className="button button-primary header-cta" href="#orcamento">Solicitar orçamento <ArrowUpRight size={16}/></a>
      <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X size={23} /> : <Menu size={23}/>}</button>
    </div>
  </header>;
}
