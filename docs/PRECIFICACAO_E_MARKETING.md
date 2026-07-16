# MatchCV — Precificação, Marketing e Próximos Passos

> Documento vivo. Atualize os números conforme os dados reais chegarem —
> tudo aqui antes do primeiro pagante é hipótese bem fundamentada, não fato.

---

## 1. Custos reais (por que a margem é altíssima)

| Item | Custo | Observação |
|---|---|---|
| IA por análise (Groq, llama-3.3-70b) | ~R$ 0,01–0,02 | ~2,5k tokens entrada + 1,2k saída. No free tier atual: R$ 0 |
| Supabase (banco, auth, storage, functions) | R$ 0/mês | Plano free aguenta milhares de usuários iniciais |
| Vercel (frontend) | R$ 0/mês | Plano hobby |
| Mercado Pago | ~4,99% (cartão BR) · Pix ~0,99% | Só paga quando recebe. Aceita CPF (sem CNPJ) |
| **Custo fixo total hoje** | **~R$ 0/mês** | Único custo real é variável e desprezível |

**Conclusão:** o preço NÃO é definido pelo custo (margem ~99%). É definido por
**valor percebido, disposição a pagar do público BR e CAC** (custo de aquisição).

## 2. Âncoras de valor (concorrência)

| Ferramenta | Preço | Nota |
|---|---|---|
| Jobscan | ~US$ 50/mês (~R$ 280) | Gringa, em inglês |
| Resume Worded | ~US$ 33/mês (~R$ 180) | Gringa, em inglês |
| Kickresume | ~US$ 19/mês (~R$ 105) | Foco em templates |
| **MatchCV** | **R$ 19,90/mês** | Português, Pix, kanban + entrevista |

Cobrar ~10% do preço da referência gringa é agressivo o bastante para o bolso
brasileiro e ainda deixa margem enorme.

## 3. Preços recomendados (já refletidos no app)

| Produto | Preço | Racional |
|---|---|---|
| **Free** | R$ 0 — 3 análises/mês | Funil de aquisição. Kanban liberado (retenção); entrevista bloqueada (desejo) |
| **Pro mensal** | **R$ 19,90/mês** | Sweet spot B2C Brasil (< uma pizza). Inclui ilimitado + perguntas de entrevista |
| **Pacote 10 créditos** | **R$ 9,90 (Pix, pagamento único)** | Captura quem não assina nada. Pix converte MUITO no BR. Sem churn |
| Anual (fase 2) | R$ 119/ano (~R$ 9,90/mês) | Caixa antecipado; lançar quando houver base |

**Matemática do negócio (premissas conservadoras):**
- Vida média do assinante: 2–3 meses (a pessoa cancela quando consegue emprego — churn estrutural do nicho).
- LTV Pro ≈ R$ 40–60. LTV crédito ≈ R$ 9,90 (mas ~zero atrito).
- **Teto de CAC: ~R$ 15–20.** Acima disso, tráfego pago não fecha a conta — por isso valide o funil orgânico ANTES de pagar tráfego.
- Meta de sanidade: 100 assinantes Pro = R$ 1.990 MRR com custo ~R$ 50.

## 4. Plano de marketing (ordem de execução)

### Fase 0 — Antes de gastar R$ 1 (semana 1–2)
1. **Ativar o Mercado Pago** (sem isso, marketing gera tráfego que não vira receita).
2. **Instrumentar**: painel /admin já mostra análises/dia e conversão; adicionar UTM nos links.
3. **Prova social real**: use o app você mesmo em 5 vagas reais; peça pra 10 amigos usarem; capture prints de resultados (com permissão) para a landing.

### Fase 1 — Orgânico e comunidades (semana 2–6, custo R$ 0)
- **Grupos de vagas** (WhatsApp/Telegram/Facebook — "vagas TI", "primeiro emprego", "vagas home office"): não faça spam; responda dúvidas de currículo e mostre o teste dos 7 segundos como conteúdo.
- **LinkedIn**: 2–3 posts/semana com "antes/depois" de score e dicas reais de currículo. O formato "seu currículo tem 7 segundos" é gancho forte.
- **TikTok/Reels/Shorts**: gravações de tela de 20–30s — cola a vaga, score sobe, keywords acendem. É o demo do hero em vídeo. 3x/semana.
- **Parcerias micro**: mentores de carreira e páginas de vagas (oferecer Pro grátis + cupom pros seguidores).
- **Meta da fase**: 200 cadastros, 10 pagantes, entender QUAL canal traz gente.

### Fase 2 — SEO (contínuo, custo R$ 0, retorno em meses)
- Páginas de conteúdo: "carta de apresentação pronta para [área]", "como passar no ATS", "palavras-chave para currículo de [profissão]".
- Alvo: caudas longas com intenção ("exemplo carta de apresentação auxiliar administrativo").

### Fase 3 — Tráfego pago (SÓ depois de ≥10 pagantes orgânicos)
- **Canal**: Meta Ads (Instagram) — público que procura emprego está lá; TikTok Ads como segundo teste.
- **Criativo**: o vídeo do demo (score subindo). Teste 3 variações de gancho: medo ("seu currículo morre em 7s"), alívio ("pare de mandar currículo no vazio"), prova ("de 42% para 78%").
- **Orçamento de teste**: R$ 20–30/dia por 2 semanas. Medir custo por cadastro (alvo < R$ 5) e por pagante (alvo < R$ 20).
- **Regra de corte**: CAC > R$ 25 por 2 semanas → pausa e volta pro orgânico/oferta.

## 5. Próximos passos (checklist)

**Produto (técnica):**
- [ ] Ativar Mercado Pago: conta (CPF) + Access Token + secrets + deploy das funções `create-checkout` e `mercadopago-webhook` (ver README)
- [ ] Testar compra em modo test do Mercado Pago (cartão de teste + Pix)
- [ ] Exportar carta em PDF (única promessa da UI ainda pendente)
- [ ] E-mail transacional de boas-vindas (Supabase Auth já manda confirmação)
- [ ] Automação de vagas paradas (badge já existe; mover automático exige pg_cron — opcional)

**Negócio:**
- [ ] Definir nome final (MatchCV vs Candidatei) e comprar domínio .com.br
- [ ] Termos de uso + política de privacidade (LGPD — vocês guardam currículos!)
- [ ] 10 usuários reais dando feedback antes de qualquer anúncio
- [ ] Prints reais de resultado para a seção de prova social da landing

**Regra de ouro:** não gaste em tráfego enquanto a conversão orgânica
cadastro→pagante for zero. Tráfego pago amplifica um funil que funciona;
não conserta um que não converte.
