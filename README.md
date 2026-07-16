# MatchCV

App web que ajuda candidatos a vagas de emprego a **gerar cartas de apresentação
personalizadas** e **analisar a compatibilidade do currículo com a vaga** usando IA.

> Nome sugerido: **MatchCV** (alinhado ao repositório). A ideia original era
> *CandidataAI* — sinta-se à vontade para trocar em `index.html`, `Logo.jsx` e neste README.

## Stack

- **React 18** + **Vite**
- **Tailwind CSS** (design limpo, mobile-first, cores neutras + azul de destaque)
- **React Router** para navegação
- **Supabase** — Auth, banco de dados (Postgres) e Storage

## Telas desta primeira versão

| Rota              | Tela                                                             |
| ----------------- | --------------------------------------------------------------- |
| `/`               | Landing page (título, 3 bullets, "Começar grátis")              |
| `/auth`           | Login e cadastro com email/senha via Supabase Auth              |
| `/onboarding`     | Primeiro acesso: colar currículo base (com "pular por agora")   |
| `/dashboard`      | **Kanban de candidaturas** (Salvas → Aplicadas → Entrevista → Oferta → Recusadas) + visão em lista |
| `/dashboard/new`  | Formulário de nova aplicação (vaga + empresa) → gera com IA      |
| `/dashboard/app/:id` | Resultado: carta editável, match score, keywords e **dicas de entrevista** |
| `/dashboard/upgrade` | Planos Free x Pro (checkout via Mercado Pago quando ativado)  |
| `/dashboard/profile` | Perfil: foto, repositório de currículos (PDF com preview inline ou texto), evolução do score e "reanalisar com vaga nova" |

Ao clicar em **"Gerar"**, o app salva a aplicação, chama a IA (via Edge Function) para
criar a **carta de apresentação**, a **análise de compatibilidade** e as **dicas de
entrevista**, salva tudo no banco (`generated_letter`, `match_analysis`,
`status = 'completed'`) e abre a tela de resultado.

## Planos e limite de uso

- **Free**: 3 gerações por mês (contador `generations_used` em `profiles`, resetado
  mensalmente). O limite é **enforçado no servidor**, na Edge Function — o usuário não
  consegue editar as colunas de plano/uso (ver migration 0003).
- **Pro** (R$ 19,90/mês): gerações ilimitadas + perguntas de entrevista (gate no
  servidor), via assinatura Mercado Pago (Preapproval).
- **Pacote de créditos** (R$ 9,90 / 10 análises): pagamento único via Pix ou cartão
  (`create-checkout` com `product: 'credits'` → webhook soma em `profiles.credits`).
- **Admin**: rota `/admin` (role `admin` em `profiles`, leitura ampla via RLS;
  escrita administrativa pela função `admin-actions` com service role).
- Precificação e plano de marketing: [`docs/PRECIFICACAO_E_MARKETING.md`](docs/PRECIFICACAO_E_MARKETING.md).

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar um projeto Supabase e aplicar o schema

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute as migrations da pasta
   [`supabase/migrations/`](supabase/migrations/) **em ordem**:
   - [`0001_init.sql`](supabase/migrations/0001_init.sql) — tabelas `profiles` e
     `applications`, **RLS** e políticas por usuário.
   - [`0002_avatars.sql`](supabase/migrations/0002_avatars.sql) — coluna
     `avatar_url`, bucket de Storage `avatars` (público) e políticas de upload.
   - [`0003_kanban_billing.sql`](supabase/migrations/0003_kanban_billing.sql) —
     coluna `stage` (kanban) e colunas de plano/uso/Stripe em `profiles`
     (protegidas: só o servidor pode alterá-las).
   - [`0004_resumes.sql`](supabase/migrations/0004_resumes.sql) — repositório de
     currículos: tabela `resumes` (versões, RLS por dono), `applications.resume_id`
     e bucket privado `resumes` para PDFs (preview via URL assinada).
   - [`0005_roles_admin_credits.sql`](supabase/migrations/0005_roles_admin_credits.sql) —
     roles user/admin (`is_admin()` + policies de leitura ampla p/ admin), conta
     ativa/desativada, créditos avulsos, email no profile e link da vaga.
   - [`0006_application_notes.sql`](supabase/migrations/0006_application_notes.sql) —
     coluna `notes` (anotações pessoais por candidatura).
   - [`0007_score_history_followup.sql`](supabase/migrations/0007_score_history_followup.sql) —
     `score_history` (comparativo de score por versão) e `follow_up_at`.
   - [`0008_payments_ledger.sql`](supabase/migrations/0008_payments_ledger.sql) —
     tabela `payments` (ledger `pending → paid` por cobrança) e `payment_webhook_events`
     (idempotência do webhook), ambas RLS: dono/admin só leem, escrita é só via
     service role nas Edge Functions.
   - [`0009_mercadopago_profiles.sql`](supabase/migrations/0009_mercadopago_profiles.sql) —
     remove `stripe_customer_id` e renomeia `stripe_subscription_id` para
     `mercadopago_subscription_id` em `profiles`.
   > Usando a Supabase CLI? Rode `supabase db push` com o projeto linkado.

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha com os valores do seu projeto (em **Project Settings → API**):

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-public-key
```

### 4. Deployar a Edge Function de IA

A geração por IA roda numa **Supabase Edge Function** (`supabase/functions/generate-application`)
para manter a **chave da IA no servidor** — ela nunca vai para o frontend.

Pegue uma chave **grátis** do Groq (free tier, sem cartão) em https://console.groq.com/keys, então:

```bash
# 1. Configure a chave do Groq como secret (só no servidor)
supabase secrets set GROQ_API_KEY=...

# 2. Faça o deploy da função
#    --no-verify-jwt: evita que o gateway do Supabase bloqueie o preflight CORS
#    (a requisição OPTIONS do navegador não leva Authorization). A própria função
#    valida o usuário por dentro via supabase.auth.getUser() + RLS, então continua seguro.
supabase functions deploy generate-application --no-verify-jwt
```

> Modelo usado: **`llama-3.3-70b-versatile`** via **Groq** (API compatível com OpenAI,
> free tier generoso e sem cartão), `max_tokens = 1500`. A função valida o usuário pelo JWT
> (RLS aplicada), busca o `base_resume` e a `job_description`, chama o Groq em JSON mode
> (`response_format: json_object`) para obter `cover_letter`, `keywords_present`,
> `keywords_missing` e `match_score`, e salva o resultado. Para trocar de modelo, edite a
> constante `MODEL` na função e rode o deploy de novo.

Para testar a função localmente: `supabase functions serve generate-application`
(com `GROQ_API_KEY` no seu `supabase/.env`).

### 4b. Login com Google (opcional)

O botão "Continuar com Google" já está na tela de login. Para habilitar:

1. No [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services →
   Credentials → Create OAuth client ID** (tipo Web). Em *Authorized redirect URIs*,
   adicione: `https://SEU_PROJECT_REF.supabase.co/auth/v1/callback`
2. No Supabase → **Authentication → Providers → Google**: ative e cole o Client ID
   e o Client Secret.
3. Em **Authentication → URL Configuration**: confira se a *Site URL* é a URL do app
   no Vercel (senão o redirect volta pro lugar errado).

Enquanto não habilitar, o botão mostra um aviso amigável. O Facebook está como
placeholder ("em breve") — mesmo processo quando quiser ativar.

> Usuários que entram pelo Google caem no fluxo normal: o trigger cria o profile
> (com email) e o onboarding aparece no primeiro acesso.

### 5. Pagamentos (Mercado Pago) — pronto para ativar

O código do checkout e do webhook já está no repositório
(`supabase/functions/create-checkout` e `supabase/functions/mercadopago-webhook`).
Enquanto não forem ativados, o botão "Assinar Pro" mostra "em breve" — nada quebra.

> Por que Mercado Pago e não Stripe: o Stripe exige verificação de identidade mais
> rígida para pessoa física sem CNPJ; o Mercado Pago aceita CPF direto e o Pix é
> nativo — essencial pro público brasileiro.

Quando quiser ativar:

1. Crie uma conta em [mercadopago.com.br](https://www.mercadopago.com.br) (aceita
   CPF, sem precisar de CNPJ) e gere um **Access Token** em
   **Suas integrações → Criar aplicação → Credenciais** (`TEST-...` para testar,
   depois a de produção).
2. Configure os secrets das Edge Functions (Dashboard → Edge Functions → Secrets):
   - `MP_ACCESS_TOKEN` — o Access Token do passo 1
   - `MP_WEBHOOK_SECRET` — gerado ao registrar a URL do webhook (passo 4)
   - `APP_URL` — URL do app (ex.: `https://match-cv-nine.vercel.app`)
   - Opcional: `MP_PRO_AMOUNT` (default `19.90`), `MP_CREDITS_AMOUNT` (default
     `9.90`), `MP_CREDITS_QTY` (default `10`) — pra mudar preço sem redeploy.
3. Deploy das duas funções (com verificação de JWT desligada — a auth do checkout é
   validada dentro da função e o webhook usa assinatura HMAC do Mercado Pago):
   ```bash
   supabase functions deploy create-checkout --no-verify-jwt
   supabase functions deploy mercadopago-webhook --no-verify-jwt
   ```
   > **Cartões nunca são armazenados no app** — digitação e gestão (troca de
   > cartão, cancelamento) acontecem 100% na página hospedada do Mercado Pago;
   > o usuário cancela pela própria conta MP em "Suas assinaturas" (sem portal
   > próprio pra construir).
4. No painel do Mercado Pago → **Suas integrações → Webhooks**, registre a URL
   `https://SEU_PROJECT_REF.supabase.co/functions/v1/mercadopago-webhook` com os
   eventos de **Pagamentos** e **Assinaturas**. Copie a **Assinatura secreta**
   gerada e salve como secret `MP_WEBHOOK_SECRET`.

Fluxo (créditos): "Comprar no Pix" → `create-checkout` cria uma linha `pending` em
`payments` e uma Preferência do Checkout Pro (cartão ou Pix) → usuário paga →
`mercadopago-webhook` confirma o pagamento (`GET /v1/payments/:id`), marca a linha
como `paid` e credita `profiles.credits`.

Fluxo (assinatura): "Assinar Pro" → `create-checkout` cria um Preapproval (só
cartão, Mercado Pago não tem Pix recorrente) → usuário autoriza na página do MP →
webhook confirma (`status: authorized`) e marca `plan = 'pro'`. Cancelamento pelo
usuário (na própria conta MP) dispara o webhook de volta e o plano volta pra `free`.

### 6. Rodar

```bash
npm run dev
```

Abra http://localhost:5173.

> **Confirmação de email:** por padrão o Supabase pede confirmação por email no
> cadastro. Para testar o fluxo direto (cadastro → onboarding) sem email, desative
> em **Authentication → Providers → Email → Confirm email**. Com a confirmação
> ligada, o app mostra um aviso pedindo para confirmar o email antes do login.

## Modelo de dados

### `profiles`
| Coluna        | Tipo          | Notas                                        |
| ------------- | ------------- | -------------------------------------------- |
| `id`          | uuid (PK)     | referencia `auth.users(id)`                  |
| `base_resume` | text          | currículo base em texto                      |
| `onboarded`   | boolean       | controla o onboarding único (default `false`)|
| `avatar_url`  | text          | URL pública da foto de perfil (Storage)      |
| `created_at`  | timestamptz   | default `now()`                              |

### `applications`
| Coluna             | Tipo         | Notas                                |
| ------------------ | ------------ | ------------------------------------ |
| `id`               | uuid (PK)    | default `gen_random_uuid()`          |
| `user_id`          | uuid (FK)    | referencia `auth.users(id)`          |
| `company_name`     | text         | opcional                             |
| `job_description`  | text         | descrição da vaga                    |
| `generated_letter` | text (null)  | carta gerada pela IA (próxima etapa) |
| `match_analysis`   | jsonb (null) | análise da IA (próxima etapa)        |
| `status`           | text         | default `draft`                      |
| `created_at`       | timestamptz  | default `now()`                      |

> A coluna `onboarded` foi adicionada além do escopo original para atender aos
> requisitos "onboarding uma vez só" e "pular por agora" de forma confiável.

## Segurança (RLS)

O RLS está **habilitado** em `profiles` e `applications`. As políticas garantem
que cada usuário só acesse (`select`) e altere (`insert`/`update`/`delete`) linhas
onde `auth.uid()` corresponde ao dono (`id` em profiles, `user_id` em applications).

## Estrutura do projeto

```
src/
  components/     # Logo, Spinner, Navbar, guards de rota, layout
  context/        # AuthContext, ProfileContext
  lib/            # cliente Supabase
  pages/          # Landing, Auth, Onboarding, Dashboard, NewApplication
  App.jsx         # rotas
  main.jsx        # bootstrap
supabase/
  migrations/     # schema + RLS
```

## Estrutura do projeto (adições desta etapa)

```
src/
  lib/api.js                 # invoca a Edge Function e trata erros
  pages/ApplicationDetail.jsx # tela de resultado (carta + score + keywords)
supabase/
  functions/generate-application/index.ts  # chamada à IA (server-side)
```

## Próximos passos

- **Exportar PDF** da carta (hoje é um placeholder).
- Streaming da geração para feedback em tempo real.
- Edição do currículo base fora do onboarding.
- Cache/histórico de versões de carta por aplicação.
