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
| `/dashboard/new`  | Formulário de nova aplicação (vaga + empresa)                   |

A geração da carta e a análise de compatibilidade por IA entram na **próxima etapa** —
por enquanto o formulário apenas salva a aplicação no banco.

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

### 4. Rodar

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

## Próximos passos

- Integrar a IA para gerar a carta de apresentação e a análise de compatibilidade
  (preencher `generated_letter` e `match_analysis`), provavelmente via Supabase
  Edge Function para manter a chave da API no servidor.
- Tela de detalhe da aplicação com a carta e a análise.
- Edição do currículo base fora do onboarding.
