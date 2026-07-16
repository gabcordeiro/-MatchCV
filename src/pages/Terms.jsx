import PublicShell from '../components/PublicShell.jsx'
import { SITE } from '../lib/site.js'

// Rascunho honesto de Termos de Uso. Revisão jurídica recomendada antes de
// operar com cobrança recorrente em escala.
export default function Terms() {
  const operator = SITE.operatorLegalName
    ? `${SITE.operatorLegalName} (responsável pelo ${SITE.name})`
    : `o responsável pelo ${SITE.name}`

  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold text-slate-900">Termos de Uso</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: {SITE.legalUpdatedAt}</p>

      <p className="mt-6 text-sm leading-relaxed text-slate-600">
        Estes Termos regem o uso do {SITE.name}, um serviço online que ajuda candidatos a
        analisar a compatibilidade do currículo com vagas, gerar cartas de apresentação com
        inteligência artificial e organizar candidaturas. Ao criar uma conta ou usar o serviço,
        você concorda com estes Termos. Se não concordar, não utilize o {SITE.name}.
      </p>

      <Section title="1. Quem oferece o serviço">
        O {SITE.name} é operado por {operator}, pessoa física, no {SITE.cityState}. Dúvidas e
        solicitações podem ser enviadas para{' '}
        <a className="text-brand-600 underline" href={`mailto:${SITE.supportEmail}`}>
          {SITE.supportEmail}
        </a>
        . Dados de identificação adicionais do responsável podem ser fornecidos mediante
        solicitação legítima.
      </Section>

      <Section title="2. Conta e cadastro">
        Para usar os recursos é necessário criar uma conta com e-mail válido. Você é responsável
        por manter a confidencialidade da sua senha e por toda atividade na sua conta. Informe
        dados verdadeiros e mantenha-os atualizados. Contas são pessoais e intransferíveis.
      </Section>

      <Section title="3. Uso aceitável">
        Você concorda em não: (a) usar o serviço para fins ilícitos; (b) enviar conteúdo de
        terceiros sem autorização; (c) tentar burlar limites de uso, segurança ou cobrança; (d)
        sobrecarregar, copiar ou fazer engenharia reversa da plataforma; (e) usar o serviço para
        gerar conteúdo falso, difamatório ou que viole direitos de terceiros. Podemos suspender
        contas que violem estas regras.
      </Section>

      <Section title="4. Planos, créditos e pagamentos">
        O {SITE.name} oferece um plano gratuito com limite mensal de análises, uma assinatura
        mensal (Pro) com uso ilimitado e recursos adicionais, e pacotes de créditos avulsos. Os
        preços vigentes são exibidos na página de planos e podem ser alterados mediante aviso
        prévio, sem afetar cobranças já realizadas. Os pagamentos são processados pelo{' '}
        <strong>Mercado Pago</strong> (cartão ou Pix); nós não armazenamos dados de cartão. A
        assinatura é renovada automaticamente até que você a cancele.
      </Section>

      <Section title="5. Cancelamento e reembolso">
        Você pode cancelar a assinatura a qualquer momento pela sua conta no Mercado Pago (menu
        “Suas assinaturas”); o acesso Pro permanece ativo até o fim do período já pago, sem
        cobrança seguinte. Créditos avulsos não são recorrentes. Por se tratar de serviço digital
        de fruição imediata, reembolsos seguem o Código de Defesa do Consumidor — em especial o
        direito de arrependimento em até 7 dias para compras feitas fora de estabelecimento
        físico. Solicitações de reembolso devem ser enviadas para {SITE.supportEmail}.
      </Section>

      <Section title="6. Natureza da análise por IA">
        As análises, cartas e sugestões são geradas por modelos de inteligência artificial e têm
        caráter de <strong>apoio</strong>. O {SITE.name} não garante contratação, entrevista,
        aprovação em triagem automatizada (ATS) ou qualquer resultado profissional. Revise sempre
        o conteúdo antes de enviá-lo a um recrutador. Você é o único responsável pelo uso que faz
        do material gerado.
      </Section>

      <Section title="7. Conteúdo do usuário e propriedade intelectual">
        Você mantém a titularidade dos currículos e textos que envia. Você nos concede uma licença
        limitada para processar esse conteúdo com a finalidade de operar o serviço (inclusive
        enviá-lo a provedores de IA para gerar as análises — veja a{' '}
        <a className="text-brand-600 underline" href="/privacidade">
          Política de Privacidade
        </a>
        ). A marca, o software e o design do {SITE.name} são de titularidade do responsável pelo
        serviço e não podem ser copiados sem autorização.
      </Section>

      <Section title="8. Suspensão e encerramento">
        Podemos suspender ou encerrar contas que violem estes Termos ou a lei. Você pode encerrar
        sua conta a qualquer momento solicitando pelo e-mail de contato. O encerramento não gera
        reembolso de valores já consumidos.
      </Section>

      <Section title="9. Limitação de responsabilidade">
        O serviço é fornecido “no estado em que se encontra”. Na máxima extensão permitida pela
        lei, o {SITE.name} não se responsabiliza por danos indiretos, lucros cessantes ou perda de
        oportunidades decorrentes do uso ou da impossibilidade de uso do serviço, nem por
        indisponibilidades de terceiros (provedores de hospedagem, IA ou pagamento).
      </Section>

      <Section title="10. Alterações nos Termos">
        Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas pelo app ou por
        e-mail. O uso continuado após a atualização significa concordância com a nova versão.
      </Section>

      <Section title="11. Lei aplicável e foro">
        Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro do domicílio do
        consumidor para dirimir eventuais controvérsias, conforme o Código de Defesa do
        Consumidor.
      </Section>

      <p className="mt-10 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
        Dúvidas sobre estes Termos? Fale com a gente em{' '}
        <a className="text-brand-600 underline" href={`mailto:${SITE.supportEmail}`}>
          {SITE.supportEmail}
        </a>
        .
      </p>
    </PublicShell>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mt-8 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{children}</p>
    </section>
  )
}
