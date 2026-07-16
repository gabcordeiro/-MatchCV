# MatchCV — Resumo do Projeto (para retomar em outro chat)

## O que é
App web (React + Vite + Tailwind + Supabase) que ajuda candidatos brasileiros a:
analisar compatibilidade do currículo com uma vaga, gerar carta de apresentação
por IA, organizar candidaturas em kanban, e se preparar para entrevistas.

## Stack e onde vive cada coisa
- **Frontend:** React + Vite + Tailwind, deploy automático no **Vercel**
  (branch `claude/candidataai-job-app-wip3ap` → produção)
- **Backend:** Supabase (projeto `match-cv`, ref `gbfkccfgrodnawadsbfj`,
  região us-west-2) — Auth, Postgres (RLS), Storage, Edge Functions
- **IA:** Groq (`llama-3.3-70b-versatile`, API compatível com OpenAI) —
  free tier generoso, sem cartão. Secret `GROQ_API_KEY` já configurado.
- **Pagamentos:** Mercado Pago — código pronto, **conta ainda não criada/ativada**
  (trocado de Stripe: exigia CNPJ pra verificação de identidade tranquila; dono
  do projeto só tem CPF)
- **Repositório:** GitHub `gabcordeiro/-MatchCV`

## Identidade de marca
- Nome: **MatchCV**. Logo: palito de fósforo aceso em SVG (trocadilho
  "match" = fósforo + "dar match" com a vaga). Chama treme no hover.
- Paleta: off-white quente + terracota (`brand`) como acento + verde-oliva
  (`olive`) para "positivo/presente". Tipografia: Fraunces (display) + Archivo
  (corpo). Filosofia: fugir do "SaaS genérico" azul/roxo com gradiente.

## Funcionalidades já implementadas
- **Auth:** email/senha (com medidor de força: 8+ caracteres, maiúscula,
  minúscula, símbolo) + login Google (OAuth pronto, precisa habilitar
  provider no Supabase — ver `README.md` seção 4b) + Facebook como
  placeholder "em breve"
- **Onboarding:** colar currículo no primeiro acesso (ou pular)
- **Perfil (`/dashboard/profile`):** repositório de currículos — upload de
  PDF (texto extraído no navegador via pdfjs) ou colar texto, preview inline,
  múltiplas versões, evolução de score, avatar, seção de pagamento (link pra
  conta Mercado Pago do usuário — cartão nunca fica no nosso banco)
- **Nova aplicação:** cola vaga + empresa + link + escolhe currículo → gera
- **Geração por IA (Edge Function `generate-application`):** carta de
  apresentação, match score, keywords presentes/faltantes, 5 dicas de
  entrevista (**recurso Pro**, gate no servidor). Limite free: 3/mês →
  créditos avulsos → paywall.
- **Tela de resultado (`/dashboard/app/:id`):** score animado, keywords
  destacadas na carta (diff visual), teste dos 7 segundos (simula triagem
  de recrutador), áudio do "mentor" (Web Speech API, grátis), exportar PDF
  real (jsPDF), regerar escolhendo outra versão do currículo, comparativo
  de scores entre versões, "cubra as lacunas" (frases prontas pros termos
  faltantes), anotações pessoais (autosave), lembrete de follow-up
- **Kanban (`/dashboard`):** 5 colunas (Salvas/Aplicadas/Entrevista/Oferta/
  Recusadas), drag-and-drop com `@dnd-kit` (funciona no toque/mobile),
  badge de follow-up, badge de "30+ dias sem resposta", confete visual ao
  mover para Oferta
- **Planos:** Free (3/mês) — Pro R$19,90/mês (ilimitado + entrevista) —
  Pacote 10 créditos R$9,90 (Pix ou cartão, avulso)
- **Admin (`/admin`):** só visível para `role = 'admin'`. Métricas (MRR,
  conversão, análises/dia), CRUD de usuários (busca, filtro, trocar plano,
  +créditos, desativar conta)

## Banco de dados (migrations em `supabase/migrations/`, todas já aplicadas)
1. `0001_init.sql` — profiles, applications, RLS básica
2. `0002_avatars.sql` — avatar_url + bucket `avatars` (público)
3. `0003_kanban_billing.sql` — stage (kanban), plan/generations_used/
   usage_reset_at/stripe_* em profiles (colunas protegidas — só servidor
   escreve)
4. `0004_resumes.sql` — tabela `resumes` (repositório), applications.resume_id,
   bucket `resumes` (privado)
5. `0005_roles_admin_credits.sql` — role (user/admin), is_active, credits,
   email, job_url, função `is_admin()` + policies de leitura ampla
6. `0006_application_notes.sql` — applications.notes
7. `0007_score_history_followup.sql` — applications.score_history (jsonb),
   follow_up_at
8. `0008_payments_ledger.sql` — tabela `payments` (ledger pending→paid) e
   `payment_webhook_events` (idempotência), escrita só via service role
9. `0009_mercadopago_profiles.sql` — drop `stripe_customer_id`, rename
   `stripe_subscription_id` → `mercadopago_subscription_id`

## Edge Functions (`supabase/functions/`)
- `generate-application` — chama Groq, aplica limite de plano, gate de
  entrevista Pro (publicada, v9 em produção)
- `create-checkout` — Mercado Pago (Preapproval p/ assinatura Pro | Preferência
  de Checkout Pro p/ créditos avulso/Pix) — **código pronto, precisa da conta
  Mercado Pago + secrets pra funcionar**
- `mercadopago-webhook` — valida assinatura HMAC, idempotência via
  `payment_webhook_events`, credita/ativa plano — **idem**
- `admin-actions` — trocar plano/créditos/desativar conta (checa role no
  servidor, nunca confia no frontend) — publicada

Não existe mais function de "customer portal": no Mercado Pago o usuário
gerencia/cancela a própria assinatura direto na conta dele (menu "Suas
assinaturas") — sem portal hospedado pra integrar.

Todas deployadas com `verify_jwt: false` porque a auth real é feita
dentro da função (getUser + RLS); isso evita bloqueio de CORS no preflight.

## Pendências conhecidas / próximos passos
1. **Ativar Mercado Pago** — criar conta (aceita CPF), gerar Access Token,
   configurar secrets (`MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_URL`),
   registrar a URL do webhook no painel MP, deploy das 2 funções de billing.
   Sem isso: MRR/churn no admin ficam zerados, e os botões de compra mostram
   "em breve".
2. **Habilitar login Google no Supabase** — criar OAuth client no Google
   Cloud, colar Client ID/Secret em Authentication → Providers → Google
   (passo a passo no README).
3. **`vercel.json`** já existe e resolve o 404 em rotas de SPA (necessário
   pra qualquer redirect de página inteira, como OAuth).
4. Testar o fluxo ponta a ponta com uma conta free de verdade (a conta do
   dono do projeto está marcada como `role = admin` + `plan = pro`).
5. Ideias registradas mas não feitas: PDF/preset de currículo editável,
   coluna "Recusadas" recolhível no kanban, confete "de verdade" (lib) ao
   mover pra Oferta.

## Documentos de referência no repo
- `README.md` — setup completo, como rodar, como ativar cada integração
- `docs/PRECIFICACAO_E_MARKETING.md` — análise de custo (~R$0,02/análise),
  preços (Pro R$19,90, créditos R$9,90/10), LTV/CAC, plano de marketing em
  fases (orgânico → SEO → tráfego pago só depois de validar conversão)

## Como o assistente tem operado
- Migrations e deploy de Edge Functions feitos via **MCP do Supabase**
  diretamente no projeto (não precisa mais de CLI local do usuário)
- Deploy do frontend é automático via Vercel a cada push na branch
- Usuário não usa terminal — prefere que tudo seja feito e só testar no
  navegador
- Chaves de API já vazadas pelo usuário no chat (Anthropic, Gemini) foram
  tratadas como comprometidas e trocadas — reforçar sempre para nunca
  colar segredos em texto no chat
