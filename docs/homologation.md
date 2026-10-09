# Homologação do PEÇA.LAB

## Estado e objetivo

Preparar uma instalação HTTPS de teste com PostgreSQL separado para validar cadastro, login, orçamento e conta. CI aprovada não significa que a hospedagem ou o Neon estejam configurados. Não receber pedidos reais nem pagamentos nesta etapa.

Acesso necessário: projeto de hospedagem e projeto Neon do PEÇA.LAB. O repositório não contém credenciais. Fornecer acesso pelas conexões dos serviços, nunca por mensagens ou commits. Escolher uma base de teste vazia; não copiar dados de clientes do banco principal.

## Preparação

1. Registrar o commit aprovado e usar exatamente essa versão na hospedagem de teste.
2. Criar/identificar um banco isolado de homologação, com usuário próprio e sem dados de produção. Confirmar que DATABASE_URL e DIRECT_URL apontam para esse banco, não para o banco comercial.
3. Configurar as variáveis privadamente no ambiente de teste:

| Variável | Configuração |
| --- | --- |
| DATABASE_URL | Conexão do banco de homologação usada pela aplicação |
| DIRECT_URL | Conexão direta do mesmo banco para migrations |
| AUTH_SECRET | Segredo aleatório exclusivo da homologação, com pelo menos 32 caracteres |
| AUTH_URL | Origem HTTPS estável da homologação |
| NEXT_PUBLIC_SITE_URL | Mesma origem HTTPS de AUTH_URL |
| AUTH_CLIENT_IP_HEADER | Header de um único IP sobrescrito pelo ingresso confiável |
| AUTH_TRUST_HOST | Habilitar apenas após confirmar a política do host/proxy |
| NEXT_PUBLIC_WHATSAPP_NUMBER | Vazio durante testes, salvo número de teste autorizado |

4. Confirmar na infraestrutura que o header de IP é sobrescrito e que não há acesso direto à origem. O fallback sem configuração é global: cinco orçamentos por 15 minutos. Isso não deve ser confundido com limitação individual pronta para uso comercial.
5. Executar os comandos abaixo com as variáveis fornecidas pelo ambiente privado. O verificador não carrega `.env.local` automaticamente.

```bash
npm ci
npm run check:deployment
npm run db:generate
npm run db:deploy
npm run build
npm start
```

`db:deploy` aplica somente migrations existentes. Não usar `db:migrate`, `migrate reset` ou `db push` na homologação hospedada. Na migração para uma infraestrutura gerenciada, adaptar build/start aos comandos do provedor; manter a aplicação das migrations como etapa controlada no banco correto.

## Critérios de aceite no endereço de teste

- HTTPS, origens consistentes, headers de proteção e ausência de indexação.
- Cadastro, login e logout funcionando; cookie de sessão HttpOnly, Secure e SameSite.
- Usuário A vê apenas seus próprios orçamentos. Usuário B não recebe dados de A.
- Visitante consegue enviar orçamento; o registro não ganha dono apenas por coincidência de e-mail.
- Solicitação autenticada recebe o userId verificado no servidor e aparece na conta.
- Reenvio com a mesma chave e os mesmos dados retorna o mesmo identificador, sem duplicar registros.
- Campos inválidos, origem incorreta, sessão adulterada e excesso de tentativas são rejeitados sem expor detalhes internos.
- Falha do banco/contador bloqueia a operação com mensagem genérica; não salva como visitante por engano.
- Navegação e formulário conferidos em celular e desktop; registro do commit, URL e resultado sem dados pessoais ou segredos.

Usar exclusivamente contas e solicitações fictícias identificáveis como teste. A suíte `test:integration` e a configuração atual de Playwright são intencionalmente limitadas ao PostgreSQL local descartável; não apontá-las para Neon nem remover suas proteções para reutilizá-las em homologação.

## Recuperação e próxima entrega

Se a aplicação falhar, interromper a liberação e corrigir a configuração ou retornar a uma versão compatível. As migrations atuais são aditivas; não apagar tabelas nem tentar desfazer o banco automaticamente. A versão anterior de autenticação não inclui as correções do PR #2 e não deve ser uma alternativa comercial silenciosa.

Após o aceite, iniciar o painel administrativo em branch própria: acesso ADMIN verificado no servidor, lista paginada de solicitações, detalhes, atualização controlada de status e histórico com autor. Propostas e pagamentos serão entregas separadas; nenhuma promoção pública de conta a ADMIN deve existir.

## Bloqueios de execução nesta sessão

Em 06/10/2026, as conexões Neon e Vercel foram localizadas, mas não estavam instaladas/conectadas. Não havia credenciais de banco nem hospedagem no ambiente de trabalho. Por isso este roteiro prepara a execução, mas não comprova criação de banco, aplicação de migrations no Neon ou publicação de URL de homologação.
