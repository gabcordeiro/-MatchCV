import { Link } from 'react-router-dom'
import PublicShell from '../components/PublicShell.jsx'
import { SITE } from '../lib/site.js'

export default function About() {
  return (
    <PublicShell>
      <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">Sobre</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
        Feito para quem cansou de mandar currículo no vazio.
      </h1>

      <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-slate-600">
        <p>
          Todo mundo conhece alguém que mandou dezenas de currículos e não recebeu nem uma
          resposta. Não é falta de talento — é que, numa vaga com centenas de candidatos, a
          primeira triagem dura segundos, muitas vezes feita por um sistema automático antes de um
          humano sequer olhar. Um currículo ótimo, mas escrito “errado” para aquela vaga, morre
          nesse filtro.
        </p>
        <p>
          O {SITE.name} nasceu para virar esse jogo. Você cola a vaga e o seu currículo, e a gente
          mostra, em segundos e em português de verdade, o que o recrutador procura e você não
          colocou — e já entrega a carta de apresentação pronta no tom da vaga. Nada de tradução
          capenga de ferramenta gringa que custa 50 dólares por mês.
        </p>
        <p>
          A filosofia é simples e a gente não esconde: <strong>barato de propósito</strong>, porque
          quem mais precisa de ajuda pra se recolocar costuma ser quem tem menos pra gastar. Pix
          avulso pra quem não quer assinar nada, mensalidade pra quem está aplicando pra valer, e
          uma primeira análise grátis pra você ver o valor antes de pagar um centavo.
        </p>
        <p>
          Por trás do {SITE.name} não tem uma big tech — tem{' '}
          {SITE.operatorLegalName ? (
            <strong>{SITE.operatorLegalName}</strong>
          ) : (
            'uma pessoa'
          )}
          , que construiu isso com cuidado e responde no WhatsApp e no e-mail. Se algo não estiver
          bom, você fala direto com quem faz — e a gente conserta.
        </p>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Principle title="Honesto">
          A IA é ajuda, não milagre. A gente diz o que ela faz e o que não faz — inclusive que não
          garante emprego.
        </Principle>
        <Principle title="Acessível">
          Preço de bolso brasileiro, Pix nativo e um plano grátis de verdade pra começar.
        </Principle>
        <Principle title="Seu dado é seu">
          Currículo é dado pessoal. A gente protege, não vende, e você pode apagar quando quiser.
        </Principle>
      </div>

      <div className="mt-10 flex flex-col items-start gap-3 border-t border-slate-200 pt-8 sm:flex-row sm:items-center">
        <Link to="/auth" className="btn-primary">
          Analisar meu currículo grátis
        </Link>
        <span className="text-sm text-slate-500">
          Tem dúvida antes?{' '}
          <Link to="/faq" className="font-semibold text-brand-600 hover:text-brand-700">
            Veja as perguntas frequentes
          </Link>{' '}
          ou{' '}
          <Link to="/contato" className="font-semibold text-brand-600 hover:text-brand-700">
            fale com a gente
          </Link>
          .
        </span>
      </div>
    </PublicShell>
  )
}

function Principle({ title, children }) {
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{children}</p>
    </div>
  )
}
