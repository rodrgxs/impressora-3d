import type { AuthService } from "./service";
import { REGISTRATION_MESSAGE } from "./service";
import { clientKey, readSmallJson, sameOrigin } from "./http";

function json(body: object, status: number, headers?: HeadersInit) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
export function createRegisterHandler(service: AuthService) {
  return async (request: Request) => {
    if (!sameOrigin(request)) return json({ error: "Solicitação não permitida." }, 403);
    let payload: unknown;
    try { payload = await readSmallJson(request); }
    catch { return json({ error: "Confira os campos e tente novamente." }, 400); }
    try {
      const result = await service.register(payload, clientKey(request.headers));
      if (result === "limited") return json({ error: "Aguarde alguns minutos antes de tentar novamente." }, 429, { "Retry-After": "900" });
      if (result === "invalid") return json({ error: "Informe nome, e-mail válido e uma senha de 12 a 128 caracteres." }, 400);
      return json({ message: REGISTRATION_MESSAGE }, 200);
    } catch {
      return json({ error: "Não foi possível concluir agora. Tente novamente mais tarde." }, 503);
    }
  };
}
