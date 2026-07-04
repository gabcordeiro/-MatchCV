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
| `/dashboard/upgrade` | Planos Free x Pro (checkout via Stripe quando ativado)        |
| `/dashboard/profile` | Perfil: foto, repositório de currículos (PDF com preview inline ou texto), evolução do score e "reanalisar com vaga nova" |

Ao clicar em **"Gerar"**, o app salva a aplicação, chama a IA (via Edge Function) para
criar a **carta de apresentação**, a **análise de compatibilidade** e as **dicas de
entrevista**, salva tudo no banco (`generated_letter`, `match_analysis`,
`status = 'completed'`) e abre a tela de resultado.

## Planos e limite de uso

- **Free**: 3 gerações por mês (contador `generations_used` em `profiles`, resetado
  mensalmente). O limite é **enforçado no servidor**, na Edge Function — o usuário não
  consegue editar as colunas de plano/uso (ver migration 0003).
- **Pro** (R$ 14,90/mês sugerido): gerações ilimitadas, via assinatura Stripe.

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

### 5. Pagamentos (Stripe) — pronto para ativar

O código do checkout e do webhook já está no repositório
(`supabase/functions/create-checkout` e `supabase/functions/stripe-webhook`).
Enquanto não forem ativados, o botão "Assinar Pro" mostra "em breve" — nada quebra.

Quando quiser ativar:

1. Crie uma conta em [stripe.com](https://stripe.com) e, no painel, um **Produto**
   "MatchCV Pro" com um **preço recorrente mensal** (ex.: R$ 14,90). Copie o
   **Price ID** (`price_...`).
2. Configure os secrets das Edge Functions (Dashboard → Edge Functions → Secrets):
   - `STRIPE_SECRET_KEY` — chave secreta do Stripe (`sk_live_...` ou `sk_test_...`)
   - `STRIPE_PRICE_ID` — o `price_...` do passo 1
   - `APP_URL` — URL do app (ex.: `https://match-cv-nine.vercel.app`)
3. Deploy das duas funções (com verificação de JWT desligada — a auth do checkout é
   validada dentro da função e o webhook usa assinatura HMAC do Stripe):
   ```bash
   supabase functions deploy create-checkout --no-verify-jwt
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. No painel do Stripe → **Developers → Webhooks**, registre o endpoint
   `https://SEU_PROJECT_REF.supabase.co/functions/v1/stripe-webhook` com os eventos
   `checkout.session.completed`, `customer.subscription.updated` e
   `customer.subscription.deleted`. Copie o **Signing secret** (`whsec_...`) e salve
   como secret `STRIPE_WEBHOOK_SECRET`.

Fluxo: usuário clica "Assinar Pro" → `create-checkout` cria a sessão → Stripe cobra →
`stripe-webhook` recebe `checkout.session.completed` → marca `plan = 'pro'` no perfil.
Cancelamentos voltam o plano para `free` automaticamente.

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
