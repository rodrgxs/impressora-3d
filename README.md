# PEÇA.LAB — Landing page de peças sob encomenda (v1)

**Marca, textos de produtos e ilustrações demonstrativos.** Este protótipo não anuncia produtos reais e não recebe pagamentos. A plataforma comercial (cadastro, banco de dados, área administrativa, pagamentos e upload de arquivos) será implementada nas próximas etapas.

## Stack

- Next.js (App Router), React e TypeScript
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

Abra `http://localhost:3000`. Para gerar a compilação de produção:

```bash
npm run build
npm start
```

**Nota:** os pacotes não estão incluídos no arquivo ZIP. É necessário acesso à internet para `npm install`. Fixe as versões efetivamente instaladas no `package-lock.json` antes de publicar.

## Como funciona o formulário nesta primeira versão

O formulário valida os campos no navegador e **gera uma mensagem para o próprio usuário copiar ou enviar manualmente**. Ele não envia solicitações automaticamente, não armazena dados e não aceita arquivos ainda. Isso evita aparentar possuir infraestrutura operacional que ainda não foi configurada.

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
  components/
    header.tsx           # Menu responsivo
    catalog.tsx          # Filtros e cartões demonstrativos
    part-art.tsx         # Ilustrações vetoriais autorais
    quote-form.tsx       # Geração local da mensagem de orçamento
  lib/
    data.ts              # Exemplos de aplicações
```

## Antes da publicação comercial

1. Definir marca, contatos, empresa responsável, materiais e tipos de fabricação efetivamente atendidos.
2. Substituir exemplos conceituais por fotografias e informações verificadas de peças reais, quando existirem.
3. Criar API de orçamentos e persistência segura em PostgreSQL; implementar upload controlado de arquivos técnicos.
4. Implementar área do cliente, autenticação, painel administrativo e pagamentos com fluxo de confirmação no servidor.
5. Disponibilizar política de privacidade, condições comerciais e canais de atendimento aplicáveis.
6. Configurar domínio, HTTPS e URL em `NEXT_PUBLIC_SITE_URL`. **Somente então** rever o `robots.ts` e `metadata.robots` no `layout.tsx`, que atualmente desabilitam indexação.
7. Executar testes de compilação, acessibilidade, integração, segurança e navegação antes de colocar pedidos reais no ar.

## Limitações de validação nesta entrega

O projeto foi gerado em ambiente sem acesso ao registro npm. Portanto, **não foi possível instalar dependências ou executar `npm run build` neste ambiente**; rode os comandos acima localmente para completar a verificação e envie erros caso apareçam.
