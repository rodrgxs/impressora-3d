import { Header } from "@/components/header";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Login | PEÇA.LAB" };
export default function LoginPage() {
  return <><Header/><main className="container auth-page"><AuthForm mode="login"/></main></>;
}
