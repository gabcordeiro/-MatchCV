import PublicShell from '../components/PublicShell.jsx'
import { SITE } from '../lib/site.js'

// Rascunho honesto de Política de Privacidade alinhada à LGPD. Revisão jurídica
// recomendada. Descreve com sinceridade os subprocessadores reais do MatchCV.
export default function Privacy() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold text-slate-900">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-slate-500">Última atualização: {SITE.legalUpdatedAt}</p>

      <p className="mt-6 text-sm leading-relaxed text-slate-600">
        Esta Política explica como o {SITE.name} coleta, usa, compartilha e protege seus dados
        pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 —
        LGPD). Ao usar o serviço, você concorda com as práticas descritas aqui.
      </p>

      <Section title="1. Dados que coletamos">
        <b>Cadastro:</b> e-mail e senha (a senha é armazenada de forma criptografada pelo nosso
        provedor de autenticação; nunca a vemos). Se você entrar com o Google, recebemos seu
        e-mail e nome básico. <b>Conteúdo que você fornece:</b> currículos (texto ou PDF),
        descrições de vagas, anotações e o conteúdo gerado a partir deles. <b>Uso:</b> dados de
        utilização como número de análises, plano e datas. <b>Pagamento:</b> processado pelo
        Mercado Pago — <b>não coletamos nem armazenamos dados de cartão</b>; guardamos apenas o
        status e identificadores da cobrança para liberar seu acesso.
      </Section>

      <Section title="2. Para que usamos seus dados">
        Para: (a) criar e manter sua conta; (b) gerar as análises, cartas e sugestões que você
        solicita; (c) processar pagamentos e liberar créditos/assinatura; (d) prestar suporte; (e)
        melhorar o serviço e prevenir fraudes. A <b>base legal</b> é principalmente a execução do
        contrato (prestar o serviço que você pediu), além do cumprimento de obrigações legais e do
        legítimo interesse em segurança e melhoria — sempre respeitando seus direitos.
      </Section>

      <Section title="3. Compartilhamento com operadores (subprocessadores)">
        Não vendemos seus dados. Compartilhamos o mínimo necessário com prestadores que operam a
        plataforma:
        <ul className="mt-3 grid gap-1.5 pl-1">
          <Li>
            <b>Supabase</b> — banco de dados, autenticação e armazenamento dos arquivos (currículos
            e avatar).
          </Li>
          <Li>
            <b>Provedor de IA (Groq)</b> — recebe o texto do seu currículo e da vaga para gerar a
            análise. É essencial saber: <b>o conteúdo do seu currículo é enviado a esse provedor</b>{' '}
            no momento da análise.
          </Li>
          <Li>
            <b>Mercado Pago</b> — processa os pagamentos (cartão e Pix).
          </Li>
          <Li>
            <b>Vercel</b> — hospedagem do site.
          </Li>
          <Li>
            <b>Google</b> — apenas se você optar por entrar com a conta Google.
          </Li>
        </ul>
      </Section>

      <Section title="4. Transferência internacional">
        Alguns desses provedores (por exemplo, o provedor de IA e a hospedagem) podem processar
        dados em servidores fora do Brasil, inclusive nos Estados Unidos. Ao usar o serviço, você
        está ciente dessa transferência, realizada conforme as hipóteses da LGPD e apenas na medida
        necessária para operar o {SITE.name}.
      </Section>

      <Section title="5. Segurança">
        Aplicamos controle de acesso por linha (Row Level Security), de modo que cada usuário só
        acessa os próprios dados; os arquivos de currículo ficam em armazenamento privado, com
        acesso por links temporários. Nenhum sistema é 100% infalível, mas trabalhamos para
        proteger seus dados com medidas técnicas e organizacionais razoáveis.
      </Section>

      <Section title="6. Retenção e exclusão">
        Guardamos seus dados enquanto sua conta existir e pelo tempo necessário para cumprir
        obrigações legais. Você pode excluir currículos e candidaturas a qualquer momento no app,
        ou solicitar a exclusão completa da conta pelo e-mail de contato.
      </Section>

      <Section title="7. Seus direitos (LGPD)">
        Você pode, a qualquer momento: confirmar a existência de tratamento; acessar seus dados;
        corrigir dados incompletos ou desatualizados; solicitar anonimização, bloqueio ou
        eliminação; solicitar portabilidade; e revogar consentimento. Para exercer qualquer
        direito, escreva para{' '}
        <a className="text-brand-600 underline" href={`mailto:${SITE.supportEmail}`}>
          {SITE.supportEmail}
        </a>
        .
      </Section>

      <Section title="8. Cookies e armazenamento local">
        Usamos armazenamento local do navegador para manter você conectado e lembrar preferências
        (como a visão do kanban e colunas recolhidas). Não usamos cookies de publicidade de
        terceiros.
      </Section>

      <Section title="9. Menores de idade">
        O {SITE.name} é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de
        menores.
      </Section>

      <Section title="10. Alterações nesta Política">
        Podemos atualizar esta Política. Mudanças relevantes serão comunicadas pelo app ou por
        e-mail, com a data de atualização revisada no topo.
      </Section>

      <p className="mt-10 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">
        Encarregado de dados / contato de privacidade:{' '}
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
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  )
}

function Li({ children }) {
  return (
    <li className="flex gap-2">
      <span className="mt-0.5 text-brand-500">—</span>
      <span>{children}</span>
    </li>
  )
}
