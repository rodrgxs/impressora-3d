# Correções prioritárias — 06/10/2026

Base: `56e42cf` (`feat/customer-auth`). Branch: `fix/priority-hardening`.

## O que muda

- Orçamento usa contador atômico no PostgreSQL, compartilhado entre processos, no namespace `quote-ip`. Remove o Map local. A indisponibilidade do contador retorna 503 antes de persistir.
- Login, cadastro e orçamento usam a mesma política de IP: sem header confiável configurado, bucket global conservador; header configurado aceita um único IP válido, com canonicalização de IPv6. O proxy deve sobrescrever o header e impedir acesso direto. O código não consegue garantir essa propriedade da infraestrutura sozinho.
- Orçamento exige Origin igual à aplicação e JSON com MIME exato. O leitor compartilhado interrompe/cancela o stream assim que supera 16 KiB, inclusive com Content-Length ausente ou falso.
- Nova migration aditiva `20261006140000_quote_submission_idempotency` adiciona chave e fingerprint opcionais, índice único e constraint do par. As três migrations anteriores não foram editadas. Dados antigos permanecem com NULL.
- UUID v4 no header Idempotency-Key evita duplicação em retries/concorrência. O fingerprint inclui payload normalizado e userId do servidor. Reutilizar a chave para outros dados/identidade retorna 409; repetir o mesmo envio retorna o mesmo ID com 201. O rate limit também se aplica aos retries. Chave é opcional para preservar integrações existentes; o formulário sempre a envia.
- Formulário usa o mesmo schema do servidor, carregado sob demanda. Erros aparecem por campo, associados via aria-describedby e aria-invalid, com foco no primeiro inválido. Mensagens não exibem payloads ou detalhes internos.
- Confirmação permanece até iniciar outro orçamento; o resumo copiado e o WhatsApp incluem o identificador. Dados são preservados ao falhar e retries sem edição mantêm a chave. A chave não persiste após recarregar a página; não há armazenamento de dados pessoais no localStorage.
- Inputs de orçamento têm 16 px, labels/asteriscos ficam na mesma linha, foco/contraste foram ajustados e controles estreitos podem quebrar linha. Manrope variável é servida localmente com next/font/local e licença incluída; não depende do Google Fonts no build.
- Header oferece skip link, aria-controls, Escape com retorno de foco e fechamento por clique externo. Consulta a sessão para diferenciar Entrar/Minha conta. Essa consulta também permite renovação de sessão pelo Auth.js. A autorização permanece exclusivamente no servidor.
- Texto da conta não promete uma consulta anônima por ID inexistente. Processo apresenta as seis etapas condicionadas à avaliação e contratação.
- Headers: CSP, frame-ancestors none, X-Frame-Options DENY, nosniff, política de referrer e restrição de câmera/microfone/localização. A CSP mantém unsafe-inline para hidratação estática do Next e estilos existentes; não é uma CSP estrita baseada em nonce. Não há claim de eliminação total de XSS.

## Dependências

Prisma/Client passaram de 6.19.0 para 6.19.3. Next permanece em 15.5.27; nenhuma migração maior de framework foi feita.

Overrides explícitos, com lockfile atualizado:

- `next > postcss`: 8.5.28. Atualiza a cópia interna vulnerável, preservando PostCSS 8.
- `@prisma/config > deepmerge-ts`: 8.0.2. Release 8 muda mesclagem de Maps e APIs auxiliares. O projeto usa configuração simples, sem Maps; teste de compatibilidade carrega uma configuração real pelo loader do Prisma. Não é garantia de compatibilidade com configurações futuras arbitrárias.
- `postcss-selector-parser`: 7.1.6. Testado com a compilação dos estilos atuais.

A atualização patch do Prisma também atualiza sua dependência Effect para uma versão corrigida. O único pacote novo do projeto é `@playwright/test`, apenas em desenvolvimento, para verificação de jornadas e responsividade.

Resultado observado: `npm audit --omit=dev` sem alertas. Audit completo mantém sete entradas altas, todas derivadas do advisory `GHSA-vfj7-8cjw-p6xm` de braces. Não são sete falhas independentes. Em 06/10/2026, braces 3.0.3 ainda não tem release corrigida. É usado por ferramentas de desenvolvimento sobre padrões controlados pelo repositório; não é entrada de API do PEÇA.LAB.

A exceção em `docs/audit-exceptions.json` tem pacote e advisory exatos, exige árvore somente de desenvolvimento e expira em 06/11/2026. `npm run audit:check` imprime o risco e bloqueia advisories novos, exceção vencida, presença em runtime ou falha de consulta. `npm audit` continua saindo com falha enquanto esse risco existir. Rever a exceção antes de produção; não aceitar glob/CSS de usuários nas ferramentas.

Fontes de compatibilidade e risco:

- https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0
- https://github.com/RebeccaStevens/deepmerge-ts/security/advisories/GHSA-ggr8-5vv4-36mx
- https://github.com/micromatch/braces/issues/73

## Testes e gates

- Testes de serviços/handlers usam PGlite isolado e Auth.js real, com fronteira Prisma substituída. Incluem migrations, sessão/CSRF, isolamento de contas, spoofing de IP, contador concorrente, idempotência, erro genérico, leitura limitada e validação.
- Teste do loader de configuração cobre o caminho utilizado pelo override de deepmerge-ts.
- Playwright testa ausência de overflow nas páginas públicas em 320, 375, 390, 430, 768, 1024, 1440 e 2560 px; menu/teclado; erro por campo; retries com mesma chave; protocolo; headers/hidratação/filtros; redirect de conta.
- Os testes públicos de formulário interceptam a API deliberadamente; não devem ser descritos como prova de persistência real.
- `test:integration` conecta Prisma real a PostgreSQL local dedicado e verifica cadastro, login, propriedade, constraints/índice usados na idempotência e contador compartilhado. O teste recusa host remoto ou banco com outro nome.
- O cenário E2E real de cadastro/login/orçamento/conta/logout só executa com o banco isolado habilitado; sem ele, fica explicitamente skipped.
- `.github/workflows/quality.yml` cria PostgreSQL 16 efêmero e executa install, generate, unit/integration, lint, build, typecheck, audit e navegador. As credenciais literais do workflow são exclusivamente desse banco descartável de CI, não do Neon. CI não contém deploy.

Validação local: 30 testes de serviços/handlers/configuração aprovados; lint, build e typecheck aprovados; cinco cenários de navegador aprovados. O cenário de banco real ficou skipped localmente por ausência do PostgreSQL dedicado. A home manteve First Load JS em aproximadamente 113 kB (112 kB antes), com validação carregada sob demanda. Resultados remotos são descritos no PR. A mera inclusão de um workflow não significa que a execução remota passou.

## Configuração antes de ativar a branch

1. Em homologação autorizada, configurar privadamente DATABASE_URL, DIRECT_URL, AUTH_SECRET e AUTH_URL. Orçamento agora depende de AUTH_SECRET e da tabela AuthRateLimit, mesmo para visitante.
2. Aplicar migrations pendentes com `npm run db:deploy`; nunca resetar o banco. A nova migration só adiciona colunas/índice/constraint. Rever bloqueio de tabela/janela operacional antes de aplicar em banco com volume significativo.
3. Configurar AUTH_CLIENT_IP_HEADER somente para um único IP sobrescrito pelo proxy e bloquear acesso direto à origem. Não copiar um x-forwarded-for do navegador como se fosse confiável. Sem isso, cinco solicitações globais por 15 min podem bloquear usuários legítimos.
4. Conferir HTTPS e mesmas origens em AUTH_URL/NEXT_PUBLIC_SITE_URL. `npm run check:deployment` mostra apenas os nomes dos itens faltantes, nunca seus valores. Rodar com variáveis fornecidas pelo ambiente; o script não carrega .env.local automaticamente.
5. Validar jornadas reais, cookies, sessão, cabeçalhos e migrations em homologação. Não misturar as variáveis de CI com as do negócio.

Nenhum comando deste trabalho aplicou migration no Neon, fez merge ou realizou deploy comercial.

## Pendências que não devem ser declaradas resolvidas

- Validação no Neon e configuração do ingresso real, pooling, backups/restauração e observabilidade operacional.
- Recuperação de senha/verificação de e-mail/revogação central: precisam do fluxo de e-mail e das definições de operação. Sessões JWT copiadas não são revogadas globalmente pelo logout de um navegador.
- Admin e atendimento, catálogo real, upload privado, propostas, pedidos e pagamentos: são módulos futuros, não funcionalidades corrigidas nesta branch.
- Invariantes financeiras futuras, como unitPrice não negativo e fechamento de totais, devem ser definidas antes do checkout e adicionadas por novas migrations. Nenhum fluxo financeiro novo foi ativado.
- Identificação da empresa, contato real, privacidade/retenção e textos comerciais. Não foram inventados contatos ou textos jurídicos definitivos.
- Medições de LCP/INP/CLS em condições reais, Safari/iPhone físico e avaliação com tecnologia assistiva. Testes de layout em Chromium não equivalem a certificação WCAG.
- SEO comercial permanece bloqueado intencionalmente para o protótipo. Não habilitar indexação antes de conteúdo/domínio/negócio prontos.

A base fica preparada para continuar pelos módulos de conta e atendimento após revisar esta branch e validar a homologação. Os itens acima não impedem revisão do código, mas continuam gates de lançamento comercial.
