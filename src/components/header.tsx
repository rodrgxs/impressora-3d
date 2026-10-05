"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function Header() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <header className="site-header">
    <div className="container header-inner">
      <Link href="/#inicio" aria-label="PEÇA.LAB — início" className="brand" onClick={close}><span className="brand-mark">P<span>·</span></span><span>PEÇA<span className="brand-dot">.</span>LAB<small>ESTÚDIO DE PEÇAS • MARCA PROVISÓRIA</small></span></Link>
      <nav aria-label="Navegação principal" className={`main-nav ${open ? "open" : ""}`}>
        <Link onClick={close} href="/#solucoes">O que fazemos</Link><Link onClick={close} href="/#catalogo">Aplicações</Link><Link onClick={close} href="/#processo">Como funciona</Link><Link onClick={close} href="/#sobre">Sobre o projeto</Link>
        <Link onClick={close} href="/conta">Minha conta</Link>
        <Link onClick={close} className="mobile-cta" href="/#orcamento">Pedir orçamento <ArrowUpRight size={16}/></Link>
      </nav>
      <Link className="button button-primary header-cta" href="/#orcamento">Solicitar orçamento <ArrowUpRight size={16}/></Link>
      <button className="menu-toggle" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"}>{open ? <X size={23} /> : <Menu size={23}/>}</button>
    </div>
  </header>;
}
