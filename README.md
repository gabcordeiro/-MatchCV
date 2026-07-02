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
| `/dashboard`      | Lista de aplicações + "Nova aplicação"                          |
| `/dashboard/new`  | Formulário de nova aplicação (vaga + empresa) → gera com IA      |
| `/dashboard/app/:id` | Tela de resultado: carta editável, match score, keywords     |

Ao clicar em **"Gerar"**, o app salva a aplicação, chama a IA (via Edge Function) para
criar a **carta de apresentação** e a **análise de compatibilidade**, salva tudo no banco
(`generated_letter`, `match_analysis`, `status = 'completed'`) e abre a tela de resultado.

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar um projeto Supabase e aplicar o schema

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, cole e execute o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
   Isso cria as tabelas `profiles` e `applications`, habilita **RLS** e adiciona
   as políticas para que cada usuário só veja/edite seus próprios registros.
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
para manter a **chave da Anthropic no servidor** — ela nunca vai para o frontend.

```bash
# 1. Configure a chave da Anthropic como secret (só no servidor)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 2. Faça o deploy da função
supabase functions deploy generate-application
```

> Modelo usado: **`claude-haiku-4-5`** (mais barato, ótimo para testar sem gastar muito
> crédito), `max_tokens = 1500`. Para maior qualidade, troque a constante `MODEL` na função
> para `claude-sonnet-4-6` e rode o deploy de novo. A função valida o usuário pelo JWT
> (RLS aplicada), busca o `base_resume` e a `job_description`, chama a Anthropic pedindo um
> JSON estruturado (`cover_letter`, `keywords_present`, `keywords_missing`, `match_score`)
> e salva o resultado na aplicação.

Para testar a função localmente: `supabase functions serve generate-application`
(com `ANTHROPIC_API_KEY` no seu `supabase/.env`).

### 5. Rodar

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
