import { Link } from 'react-router-dom'
import PublicShell from '../components/PublicShell.jsx'
import { SITE, whatsappLink } from '../lib/site.js'

const FAQS = [
  {
    q: 'Preciso de cartão para testar?',
    a: (
      <>
        Não. Você começa com <strong>3 análises grátis por mês</strong>, sem cadastrar cartão. Só
        paga se quiser mais.
      </>
    ),
  },
  {
    q: 'O MatchCV garante que eu consiga emprego?',
    a: (
      <>
        Não, e a gente é honesto sobre isso. O {SITE.name} é uma ferramenta de <strong>apoio</strong>
        : mostra o que a vaga pede e seu currículo não mostra, melhora a carta e te prepara pra
        entrevista. Isso aumenta suas chances de passar na triagem — mas a decisão final é sempre do
        recrutador.
      </>
    ),
  },
  {
    q: 'É seguro? O que acontece com o meu currículo e meus dados?',
    a: (
      <>
        Cada usuário só acessa os próprios dados (controle de acesso por linha no banco), e os
        arquivos de currículo ficam em armazenamento privado. A gente <strong>não vende</strong> seus
        dados. Para gerar a análise, o texto do currículo e da vaga é enviado ao nosso provedor de
        inteligência artificial — explicamos tudo na{' '}
        <Link to="/privacidade" className="text-brand-600 underline">
          Política de Privacidade
        </Link>
        . Você pode apagar currículos e a conta quando quiser.
      </>
    ),
  },
  {
    q: 'Como funciona o pagamento? Posso pagar no Pix?',
    a: (
      <>
        Sim. Os pagamentos são processados pelo <strong>Mercado Pago</strong>. O pacote de créditos
        avulsos pode ser pago no <strong>Pix</strong> ou cartão (pagamento único), e a assinatura Pro
        é no cartão (recorrente). A gente nunca guarda os dados do seu cartão.
      </>
    ),
  },
  {
    q: 'Qual a diferença entre o plano Pro e os créditos avulsos?',
    a: (
      <>
        O <strong>Pro</strong> é uma assinatura mensal com análises ilimitadas e a preparação de
        entrevista incluída — ideal pra quem está aplicando pra várias vagas. Os{' '}
        <strong>créditos avulsos</strong> são um pacote pago uma vez (no Pix, sem assinatura), pra
        quem quer usar de vez em quando sem compromisso.
      </>
    ),
  },
  {
    q: 'Como cancelo a assinatura?',
    a: (
      <>
        A qualquer momento, direto na sua conta do Mercado Pago, no menu{' '}
        <strong>“Suas assinaturas”</strong>. Sem ligação, sem burocracia. O acesso Pro continua até
        o fim do período que você já pagou, sem cobrança seguinte.
      </>
    ),
  },
  {
    q: 'E se eu não gostar? Tem reembolso?',
    a: (
      <>
        Por ser um serviço digital, vale o direito de arrependimento em até <strong>7 dias</strong>{' '}
        previsto no Código de Defesa do Consumidor. É só falar com a gente em{' '}
        <a className="text-brand-600 underline" href={`mailto:${SITE.supportEmail}`}>
          {SITE.supportEmail}
        </a>
        .
      </>
    ),
  },
  {
    q: 'Serve pra qualquer área ou tipo de vaga?',
    a: (
      <>
        Sim. Você cola a descrição de qualquer vaga — de estágio a sênior, de área técnica a
        administrativa — e a análise é feita em cima dela. Quanto mais completa a descrição, melhor o
        resultado.
      </>
    ),
  },
]

export default function FAQ() {
  const wa = whatsappLink('Olá! Tenho uma dúvida sobre o MatchCV.')

  return (
    <PublicShell>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Ajuda</p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-900 sm:text-4xl">Perguntas frequentes</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        As dúvidas mais comuns antes de usar e de pagar. Não achou a sua? A gente responde.
      </p>

      <ul className="mt-6 divide-y divide-slate-200 border-y border-slate-200">
        {FAQS.map((item) => (
          <li key={item.q}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-[15px] font-semibold text-slate-900 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition-transform group-open:rotate-45">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="pb-4 pr-10 text-sm leading-relaxed text-slate-600">{item.a}</p>
            </details>
          </li>
        ))}
      </ul>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ainda com dúvida?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fala direto com a gente — a gente responde de verdade.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-primary">
              Chamar no WhatsApp
            </a>
          )}
          <Link to="/contato" className="btn-secondary">
            Ir para o Contato
          </Link>
        </div>
      </div>
    </PublicShell>
  )
}
