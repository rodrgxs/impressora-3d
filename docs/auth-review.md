# Revisão da etapa de autenticação — PEÇA.LAB

Base revisada: `c60cf76` (persistência de orçamentos), precedida por `4b74505`, `793e11c` e `947df9b`.
Branch: `feat/customer-auth`.

## Diff funcional

| Área | Alteração |
| --- | --- |
| Schema | `User.passwordHash` opcional; tabela `AuthRateLimit` com índice de expiração |
| Migration | Nova `20261005140000_customer_auth`; migrations aplicadas preservadas |
| Autenticação | Auth.js Credentials, hash scrypt, sessão JWT criptografada, logout |
| Páginas | `/cadastro`, `/login`, `/conta` protegida e lista de orçamentos próprios |
| Orçamentos | Handler preserva validação/limite existentes e associa identidade verificada no servidor; visitante mantém `null` |
| Segurança | Limites atômicos no PostgreSQL por IP/e-mail, validação, respostas genéricas, CSRF/origem, selects explícitos e erros sem detalhes de conexão |
| Navegação | Link Minha conta; links da landing funcionam também a partir das novas páginas |
| Dependências | Auth.js fixado em `5.0.0-beta.32`; PGlite `0.5.8` somente para testes; versões anteriores preservadas |
| Documentação | Configuração privada da autenticação, migration nova e limitações de validação |

Não há painel administrativo, pagamentos ou recuperação de senha nesta etapa. `ADMIN` é suportado pelo schema e pelas verificações de role; o cadastro sempre grava `CUSTOMER`. Orçamentos de visitantes não são vinculados automaticamente por e-mail.

## Revisão de segurança

- PasswordHash não é incluído nas respostas públicas; senha não recebe trim e não é registrada.
- Scrypt N=131072, r=8, p=1, salt aleatório de 16 bytes. Login inexistente/sem senha executa derivação equivalente.
- Auth.js gerencia CSRF, JWE, cookies HttpOnly/SameSite e Secure sob HTTPS.
- Para operações da aplicação, a identidade é obtida por `getToken` do Auth.js (verificação e decriptação), seguida de consulta ao banco. Falha na consulta propaga e impede gravar orçamento como visitante por engano. A conta utiliza a mesma leitura.
- Roles vêm do banco; alteração de sessão pelo navegador não promove usuário. Consultas de orçamentos são filtradas pelo próprio ID.
- Cadastro novo/duplicado tem o mesmo status e texto. Login inválido/inexistente/limitado usa o mesmo erro.
- Rate limit compartilhado entre instâncias usa UPSERT e HMAC dos identificadores. O proxy deve sobrescrever o header configurado e bloquear acesso direto; sem configuração, utiliza limite global conservador.
- Erros de banco não são expostos ou registrados integralmente. Variáveis privadas não estão presentes na entrega.

## Validação

A suíte usa PostgreSQL em memória (PGlite), aplica as três migrations e verifica preservação de usuário anterior, persistência, concorrência do limite e integrações dos handlers/serviços. A fronteira Prisma é substituída por consultas ao banco de teste. Auth.js executa de verdade os fluxos de login, sessão, cookies, CSRF, logout, adulteração e expiração.

Isso não substitui a validação ponta a ponta com Prisma conectado ao Neon nem a navegação visual em navegador. Essas validações precisam do ambiente configurado e da migration aplicada. O banco Neon, as credenciais e o deploy não foram alterados.

Comandos finais: `npm run db:generate`, `npm test` (23 testes aprovados), `npm run lint` e `npm run build` aprovados. `git diff --check` aprovado.

## Auditoria de dependências

`npm audit --omit=dev` identificou seis entradas: cinco altas e uma moderada, em Prisma/@prisma/config/deepmerge-ts/effect e Next.js/PostCSS. São cadeias já presentes na base; nenhuma entrada aponta para Auth.js. As correções sugeridas pelo npm envolvem mudança de versão principal do Next.js e alteração da versão fixada de Prisma. Nenhum `audit fix --force` foi aplicado. Recomenda-se uma etapa separada de atualização e validação antes de produção.

## GitHub

O bloqueio inicial HTTP 403 foi resolvido e a criação da branch `feat/customer-auth` no GitHub foi confirmada. A entrega segue por branch e pull request para revisão, sem merge ou deploy automático.
