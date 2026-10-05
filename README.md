# PEÇA.LAB — Landing page de peças sob encomenda (v1)

**Marca, textos de produtos e ilustrações demonstrativos.** Este protótipo não anuncia produtos reais e não recebe pagamentos. Cadastro, login e orçamentos persistidos já estão implementados. Área administrativa, pagamentos e upload de arquivos ficam para as próximas etapas.

## Stack

- Next.js (App Router), React e TypeScript
- PostgreSQL com Prisma ORM; os modelos e migrations ficam em `prisma/`
- Tailwind CSS configurado; identidade visual implementada em `src/app/globals.css` para facilitar ajustes
- Ícones Lucide React; artes vetoriais originais em CSS/SVG, sem imagens de produtos fictícias

## Requisitos e execução

Node.js 20.9+ e npm. Na pasta do projeto:

```bash
npm install
cp .env.example .env.local
npm run dev
```

No Windows PowerShell, substitua `cp` por:

```powershell
Copy-Item .env.example .env.local
```

Configure `DATABASE_URL` com a URL privada de um PostgreSQL. A URL de exemplo não contém credenciais válidas. Para desenvolvimento, configure a variável no ambiente e aplique as migrations:

```bash
npm run db:generate
npm run db:migrate
```

`npm run db:deploy` aplica migrations existentes em ambientes de implantação; `npm run db:studio` abre o Prisma Studio. A API de orçamento usa Prisma para registrar solicitações no PostgreSQL. Não use prefixo `NEXT_PUBLIC_` em variáveis de conexão ou segredos.

Abra `http://localhost:3000`. Para gerar a compilação de produção:

```bash
npm run build
npm start
```

**Nota:** os pacotes não estão incluídos no arquivo ZIP. É necessário acesso à internet para `npm install`. Fixe as versões efetivamente instaladas no `package-lock.json` antes de publicar.

## Como funciona o formulário

O formulário envia os dados para `POST /api/quotes`, que valida e normaliza o payload no servidor e registra a solicitação com status `RECEIVED`. O envio não exige conta e não aceita arquivos nesta etapa. Após a confirmação do banco, a página mostra o identificador da solicitação e oferece copiar ou compartilhar os detalhes por WhatsApp.

O endpoint aplica um limite local de cinco tentativas por IP a cada 15 minutos. Esse controle fica em memória no processo da aplicação: não é compartilhado entre instâncias ou reinicializações. Antes de operar em produção escalada/serverless, substitua-o por rate limit distribuído e configure a infraestrutura para fornecer um IP de cliente confiável.

Edite `.env.local` e informe seu **número comercial verdadeiro** no formato `55` + DDD + número, sem espaços ou `+`:

```dotenv
NEXT_PUBLIC_WHATSAPP_NUMBER=5511999999999
```

O número acima é **somente ilustrativo**. Sem configurar um número real, o botão de envio ao WhatsApp não é exibido e o usuário pode copiar sua mensagem. Reinicie `npm run dev` após editar a variável. O envio só acontece se o usuário clicar no botão para abrir o WhatsApp e confirmar a mensagem no aplicativo.

Não coloque segredos em variáveis `NEXT_PUBLIC_`: elas são públicas no navegador.

## Organização

```
src/
  app/
    globals.css          # Design system, responsividade e estilos
    layout.tsx           # Idioma, metadados e viewport
    page.tsx             # Página comercial
    robots.ts            # Bloqueio de indexação deste protótipo
    api/
      quotes/route.ts    # Criação validada e limitada de solicitações de orçamento
  components/
    header.tsx           # Menu responsivo
    catalog.tsx          # Filtros e cartões demonstrativos
    part-art.tsx         # Ilustrações vetoriais autorais
    quote-form.tsx       # Envio e confirmação de orçamento persistido
  lib/
    data.ts              # Exemplos de aplicações
    quotes/
      validation.ts      # Validação e normalização do payload público
    db/
      prisma.ts          # Cliente Prisma compartilhado por ambiente
prisma/
  schema.prisma          # Modelos, enums e relacionamentos
  migrations/            # Histórico versionado de alterações no banco
```

## Antes da publicação comercial

1. Definir marca, contatos, empresa responsável, materiais e tipos de fabricação efetivamente atendidos.
2. Substituir exemplos conceituais por fotografias e informações verificadas de peças reais, quando existirem.
3. Implementar upload controlado de arquivos técnicos e definir retenção/atendimento das solicitações registradas.
4. Implementar painel administrativo e pagamentos com fluxo de confirmação no servidor.
5. Disponibilizar política de privacidade, condições comerciais e canais de atendimento aplicáveis.
6. Configurar domínio, HTTPS e URL em `NEXT_PUBLIC_SITE_URL`. **Somente então** rever o `robots.ts` e `metadata.robots` no `layout.tsx`, que atualmente desabilitam indexação.
7. Executar testes de compilação, acessibilidade, integração, segurança e navegação antes de colocar pedidos reais no ar.

## Autenticação de clientes

- `/cadastro`: nome, e-mail e senha; todo cadastro público recebe `CUSTOMER`.
- `/login`: e-mail e senha com Auth.js (`next-auth` **5.0.0-beta.32**, versão fixada compatível com Next.js 15/React 19). O provedor Credentials utiliza sessão JWT; os modelos Account/Session existentes são preservados para futuras integrações.
- `/conta`: protegida no servidor; lista as últimas 50 solicitações do próprio cliente e permite logout. O perfil `ADMIN` está preparado no schema e nos controles de autorização, sem painel administrativo.
- Senhas de 12–128 caracteres, sem corte ou trim, usam scrypt (`N=131072`, `r=8`, `p=1`), salt aleatório de 16 bytes e chave de 64 bytes. Login inexistente/sem senha executa a mesma derivação.
- A sessão JWT é criptografada pelo Auth.js, com cookies HttpOnly/SameSite=Lax e Secure em HTTPS, duração renovável de 8 horas e CSRF gerenciado pela biblioteca. Identidade e role são consultadas novamente no banco; alterações enviadas pelo navegador não promovem permissões. Logout remove os cookies desta sessão.
- `POST /api/auth/register` exige Origin da aplicação e JSON até 4 KiB. Cadastro novo e e-mail duplicado devolvem a mesma resposta genérica, inclusive em cadastros concorrentes. Login retorna erro genérico para usuário inexistente, senha inválida e limite excedido.
- Limites compartilhados no PostgreSQL: cadastro 5 tentativas/IP e 5/e-mail por 15 minutos; login 20/IP e 10/e-mail por 15 minutos, incluindo tentativas bem-sucedidas. UPSERT atômico evita concorrência; identificadores são HMAC, sem e-mail/IP em texto. Registros expirados há mais de um dia são removidos durante o uso. Falha no armazenamento bloqueia autenticação/cadastro.
- `AUTH_CLIENT_IP_HEADER` deve ficar vazio até existir um proxy que sobrescreva esse header e impeça acesso direto à origem. Vazio aplica um limite global conservador por operação. Configure-o corretamente antes de atender múltiplos clientes em produção.
- Orçamentos autenticados recebem `userId` exclusivamente da identidade confirmada no servidor; visitantes mantêm `null`. Payload com `userId` é rejeitado. Solicitações anônimas anteriores não são vinculadas por e-mail automaticamente. Falha na consulta da sessão impede salvar um pedido incorretamente como visitante.
- Consultas de conta usam `where: { userId }` e selects explícitos; nenhuma resposta de cadastro, login, sessão ou conta inclui `passwordHash`. Erros de banco não são registrados com detalhes de conexão.

### Configuração e migration nova

Preserve as `DATABASE_URL` e `DIRECT_URL` existentes. O Prisma CLI lê `.env`/variáveis do processo; Next.js também lê `.env.local`. Não copie segredos para o código nem para o chat.

Configure privadamente `AUTH_SECRET` com um valor aleatório de pelo menos 32 caracteres. Para gerá-lo diretamente em um arquivo local ignorado pelo Git, sem mostrar o valor no terminal, execute **somente se essa variável ainda não existir**:

```bash
node -e "const fs=require('node:fs'),c=require('node:crypto'),p='.env.local';const s=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';if(/^AUTH_SECRET=/m.test(s))throw Error('AUTH_SECRET já existe; preserve o valor atual');fs.appendFileSync(p,'\nAUTH_SECRET='+c.randomBytes(48).toString('base64url')+'\n')"
```

Configure `AUTH_URL` com a origem da aplicação (`http://localhost:3000` no desenvolvimento; HTTPS em produção). `AUTH_TRUST_HOST` só deve ser habilitado em infraestrutura confiável. Não use prefixo `NEXT_PUBLIC_` para esses valores.

A migration `20261005140000_customer_auth` adiciona apenas `User.passwordHash` nullable e a tabela `AuthRateLimit`; as migrations já aplicadas permanecem intactas. Para aplicá-la no ambiente autorizado:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm test
npm run lint
npm run build
```

Não use reset nem edite migrations anteriores. Esta etapa não aplica mudanças no Neon automaticamente, não modifica credenciais e não faz deploy.

### Validação automatizada

`npm test` executa a suíte original de orçamento e a nova suíte de autenticação. PGlite roda PostgreSQL isolado em memória, aplica as migrations em ordem e verifica preservação de usuário existente, persistência, constraints e rate limit concorrente. Os serviços e handlers usam uma fronteira Prisma substituída por consultas ao banco de teste; isso não é uma conexão Prisma/Neon ponta a ponta. Auth.js é executado de verdade para validar CSRF, login, cookies, sessão, roles, expiração, adulteração, usuário removido e logout. A integração de QuoteRequest verifica o vínculo por sessão e o isolamento dos pedidos. Nenhum teste acessa Neon ou usa as credenciais locais.

Validação no ambiente Neon e navegação completa em navegador devem ocorrer após a aplicação autorizada da migration e configuração local da autenticação.
