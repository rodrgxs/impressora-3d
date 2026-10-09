"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function Header() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((session) => setSignedIn(Boolean(session?.user)))
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      )
        setOpen(false);
    }
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <header ref={headerRef} className="site-header">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <div className="container header-inner">
        <Link
          href="/#inicio"
          aria-label="PEÇA.LAB — início"
          className="brand"
          onClick={close}
        >
          <span className="brand-mark">
            P<span>·</span>
          </span>
          <span>
            PEÇA<span className="brand-dot">.</span>LAB
            <small>ESTÚDIO DE PEÇAS • MARCA PROVISÓRIA</small>
          </span>
        </Link>
        <nav
          id="primary-navigation"
          aria-label="Navegação principal"
          className={`main-nav ${open ? "open" : ""}`}
        >
          <Link onClick={close} href="/#solucoes">
            O que fazemos
          </Link>
          <Link onClick={close} href="/#catalogo">
            Aplicações
          </Link>
          <Link onClick={close} href="/#processo">
            Como funciona
          </Link>
          <Link onClick={close} href="/#sobre">
            Sobre o projeto
          </Link>
          <Link onClick={close} href={signedIn === false ? "/login" : "/conta"}>
            {signedIn === false ? "Entrar" : "Minha conta"}
          </Link>
          <Link onClick={close} className="mobile-cta" href="/#orcamento">
            Pedir orçamento <ArrowUpRight size={16} />
          </Link>
        </nav>
        <Link className="button button-primary header-cta" href="/#orcamento">
          Solicitar orçamento <ArrowUpRight size={16} />
        </Link>
        <button
          ref={toggleRef}
          aria-controls="primary-navigation"
          className="menu-toggle"
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
        >
          {open ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>
    </header>
  );
}
