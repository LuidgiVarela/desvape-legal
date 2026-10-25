# DesVape — site oficial

Landing page HTML/CSS/JS, páginas legais e uma lista de espera em Supabase Edge Function e Postgres. Sem framework ou pacote npm para a landing. O visualizador Three.js fornecido para o pinguim carrega sob demanda.

Páginas públicas:
- Início: https://luidgivarela.github.io/desvape-legal/
- Privacidade: https://luidgivarela.github.io/desvape-legal/privacy.html
- Termos: https://luidgivarela.github.io/desvape-legal/terms.html
- Suporte: https://luidgivarela.github.io/desvape-legal/support.html

Contato: desvape.suporte@gmail.com.

## Estrutura

- index.html: landing page, formulário da lista, vídeo real e FAQ.
- privacy.html, terms.html e support.html: textos legais e de suporte.
- styles.css: visual mobile-first, acessibilidade e layout responsivo.
- script.js: FAQ, vídeo, mascote e validação/interação do formulário.
- assets/config.js: URL pública da Edge Function; não contém segredos.
- supabase/functions/waitlist: endpoint público com validação e controles contra spam.
- supabase/migrations: esquema privado e rate limiter atômico.
- tests: testes sem dependências para o frontend e endpoint.

Para abrir o frontend sem instalar pacotes, execute python3 -m http.server 8000 e acesse http://localhost:8000. A inscrição só grava se a função Supabase estiver configurada e publicada. Em file://, o CORS/WebGL impede chamadas ao backend/mascote.

## Lista de espera

O formulário usa a Edge Function publicada em `assets/config.js`. Ele só confirma a inscrição depois que a função grava ou reconhece o e-mail no Postgres. A migração já foi aplicada e a função já foi publicada no projeto Supabase `sbuhhrrpobfcnczcrbgl`.

A função aceita a origem `https://luidgivarela.github.io`; a resposta CORS de preflight para essa origem foi verificada. Se o site for servido por outro domínio de produção, adicione a origem exata ao secret `WAITLIST_ALLOWED_ORIGINS` no Supabase antes de usá-lo. Não adicione origens de preview público.

A função usa as variáveis padrão `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no servidor e os secrets `WAITLIST_ALLOWED_ORIGINS` e `WAITLIST_RATE_LIMIT_SECRET`. A chave privilegiada não deve aparecer em `assets/config.js`, HTML ou JavaScript público. O endpoint aplica validação no servidor, consentimento obrigatório, honeypot, tempo mínimo de preenchimento, limite de tentativas por IP, e-mail idempotente e gravação somente dos parâmetros UTM permitidos. O IP bruto não é armazenado na lista; a tabela de rate limit guarda apenas um HMAC diário. RLS nega acesso de `anon` e `authenticated` às tabelas privadas.

O Table Editor do Supabase, em `public.desvape_launch_waitlist`, permite consultar os e-mails, a plataforma opcional, os horários e consentimentos, as UTMs filtradas e o domínio de referência. Para cancelar ou excluir uma inscrição, a pessoa pode escrever para `desvape.suporte@gmail.com`; o pedido precisa ser atendido removendo a linha no Dashboard.

A infraestrutura ainda não envia e-mails nem oferece confirmação dupla. Até integrar e testar um serviço de envio, os avisos de lançamento e pedidos de exclusão/cancelamento precisam ser processados manualmente. O consentimento informa que o endereço será usado para avisos do lançamento e a Política de Privacidade descreve os dados opcionais de campanha e referência coletados.

## GitHub Pages e Vercel

GitHub Pages continua servindo as quatro páginas estáticas existentes. As URLs internas são relativas. A função Supabase fica separada do site e serve ao formulário por HTTPS e CORS. Também é possível importar o frontend na Vercel como projeto estático (preset Other, sem build); o frontend usa a mesma Edge Function configurada no assets/config.js. Canonical e og:url continuam apontando para GitHub Pages.

## Validação

Execute `node --test tests/media.test.cjs tests/waitlist.test.cjs` para os testes locais. Eles cobrem interações de mídia, validação, duplicados, rate limit, UTM, CORS e falhas da função. Confira o layout visual no Chrome DevTools responsive, incluindo 320, 375, 390, 430, 768 e 1440 px. O formulário funciona apenas em origens autorizadas no CORS; a inscrição local em `localhost` não é permitida pela configuração de produção.
