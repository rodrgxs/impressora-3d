import { Header } from "@/components/header";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Cadastro | PEÇA.LAB" };
export default function RegistrationPage() {
  return <><Header/><main id="conteudo" tabIndex={-1} className="container auth-page"><AuthForm mode="register"/></main></>;
}
