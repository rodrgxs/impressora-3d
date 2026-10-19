# Central de orçamentos — primeira entrega

Rotas: `/admin`, `/admin/orcamentos/[id]` e `PATCH /api/admin/quotes/[id]`.

O painel apresenta 25 solicitações por página, busca por peça/cliente/protocolo exato, filtro de andamento, dados de contato e descrição. Detalhes mostram as últimas 50 alterações; não há exportação de dados em massa.

A conta ADMIN mostra um link para a central. Usuários não autenticados vão para login; clientes são redirecionados à própria conta. Serviços consultam o papel atual no banco antes de ler/gravar. A API rejeita visitantes (401), clientes e papéis revogados (403), origem diferente (403), dados inválidos (400), registro inexistente (404), estado desatualizado/transição indevida (409) e excesso de alterações (429). Falha inesperada retorna 503 genérico; respostas de API são no-store.

As mudanças disponíveis são análise, solicitação de informações, recusa e cancelamento, conforme o andamento atual. Aceite, expiração e envio de proposta não podem ser simulados manualmente: pertencem aos módulos comerciais seguintes. Não há reabertura de estados finais nesta entrega.

Cada mudança exige observação interna de 3–1.000 caracteres. A transação registra status, data e histórico com o administrador identificado pelo servidor. A comparação de status e updatedAt impede duas gravações simultâneas sobre a mesma versão. Falha na criação do histórico desfaz a atualização. A nota não é exposta na conta do cliente. Nenhuma mensagem é enviada automaticamente por e-mail ou WhatsApp.

## Primeiro administrador

O cadastro público continua criando somente CUSTOMER. Nenhum usuário real foi promovido nesta entrega. Após escolher explicitamente a identidade responsável, criar a conta normalmente e confirmar seu ID no banco privado correto. O operador autorizado pode executar `scripts/grant-admin.mjs` com DATABASE_URL, ADMIN_USER_ID, ADMIN_CONFIRM_USER_ID (mesmo ID) e ADMIN_DATABASE_HOST (host exato do banco desejado), todos fornecidos privadamente pelo ambiente. O script não cria senha nem aceita promoção pelo navegador. A checagem de host é uma confirmação operacional, não uma camada de autorização de banco.

Para revogar o papel, um operador autorizado altera a conta para CUSTOMER no banco correto. A próxima consulta ou ação administrativa verifica o papel novamente. Isso não substitui uma política futura de autenticação forte para administradores, revogação central de sessões e recuperação de conta.

## Validação

Testes locais cobrem a barreira de autorização, papéis revogados, origem, limites, falha fechada e payloads adulterados. A integração com PostgreSQL descartável cobre concorrência, uma única entrada de histórico, associação do autor, consulta/filtragem e visibilidade do status na conta do cliente. O E2E cobre acesso negado ao cliente, login de administrador, filtro, atualização, persistência, histórico e revogação de papel, com layout em quatro larguras. As capturas usam exclusivamente dados sintéticos de teste.

### Resultado local em 11/10/2026

- 35 testes unitários aprovados; lint, build de produção e verificação TypeScript aprovados.
- Os sete testes E2E passaram no Chromium, usando Prisma e um banco PGlite descartável com as quatro migrations. O cenário administrativo exercitou acesso negado ao cliente, login, busca, alteração persistida, histórico e revogação; foram conferidas capturas de desktop e celular.
- O teste de integração administrativo passou no PGlite. O teste de integração de cadastro/idempotência falhou nesse ambiente com encerramento de conexão; a suíte de integração completa **não está aprovada** para esta branch.
- O PGlite via socket multiplexa uma única conexão e não substitui o PostgreSQL nativo para validar concorrência. A suíte completa com PostgreSQL 16 no CI permanece obrigatória antes de integrar esta entrega. O ambiente auxiliar não altera as dependências ou a configuração de produção.

## Infraestrutura em 09/10/2026

- PRs #1 e #2 integrados; CI da main aprovado no commit `2574717`.
- Neon: projeto separado `peca-lab-homologacao` em São Paulo, PostgreSQL 18, banco vazio `peca_lab_staging`; produção não foi copiada nem modificada.
- As quatro migrations versionadas foram aplicadas por transação através da conexão Neon, após conferir schema vazio. Foram registrados nomes/checksums reais em `_prisma_migrations` na mesma transação. O Prisma deste executor não conseguiu alcançar a porta do banco; validar `prisma migrate status` no ambiente de hospedagem antes de liberar.
- Vercel: projeto `peca-lab-homologacao` criado, mas alteração de configuração foi recusada com HTTP 403 para a equipe vinculada. Nenhum deploy nem URL de homologação foi confirmado. Nenhuma proteção de acesso foi desabilitada.
- O banco isolado permanece sem contas ou pedidos reais. A identidade do primeiro administrador ainda precisa ser definida pelo responsável.

Homologação hospedada e aceite operacional permanecem pendentes. O GitHub Pages existente executou seu fluxo automático após o merge, mas isso não fornece o servidor Next.js/Prisma necessário para testar esta aplicação full-stack.
