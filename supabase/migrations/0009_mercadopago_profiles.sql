-- MatchCV — troca de Stripe para Mercado Pago em profiles
--
-- Motivo: Stripe exige verificação de identidade mais rígida pra pessoa física sem
-- CNPJ; Mercado Pago aceita CPF direto e Pix é nativo. O Stripe nunca chegou a ser
-- ativado (colunas sempre nulas, nenhum pagamento real processado), então trocamos
-- as colunas de integração em vez de manter as duas em paralelo.

-- stripe_customer_id sai: não existe um "customer" reutilizável equivalente no
-- fluxo do Mercado Pago usado aqui (Preferences + Preapproval por e-mail).
alter table public.profiles
  drop column if exists stripe_customer_id;

-- stripe_subscription_id vira mercadopago_subscription_id: guarda o id do
-- preapproval, usado pra checar/gerenciar o status da assinatura.
alter table public.profiles
  rename column stripe_subscription_id to mercadopago_subscription_id;
