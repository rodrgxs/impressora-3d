import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";

const manrope = localFont({
  src: "../fonts/manrope-latin-variable.woff2",
  variable: "--font-interface",
  weight: "200 800",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "PEÇA.LAB | Peças sob encomenda e projetos especiais",
  description:
    "Explore aplicações e solicite a avaliação de peças automotivas e componentes personalizados sob encomenda.",
  openGraph: {
    type: "website",
    title: "PEÇA.LAB | Peças sob encomenda",
    description: "Peças únicas para projetos que merecem continuar.",
    url: "/",
    locale: "pt_BR",
  },
  robots: { index: false, follow: false }, // Prototipo: habilitar indexacao apenas com negocio e conteudo reais.
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101114",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={manrope.variable}>{children}</body>
    </html>
  );
}
