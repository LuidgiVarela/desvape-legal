# DesVape — site oficial

Landing page estática, páginas legais e suporte. HTML, CSS e JavaScript nativos, sem dependências, backend, rastreamento, fontes externas ou etapa de build.

## Páginas públicas

- [Início](https://luidgivarela.github.io/desvape-legal/)
- [Privacidade](https://luidgivarela.github.io/desvape-legal/privacy.html)
- [Termos](https://luidgivarela.github.io/desvape-legal/terms.html)
- [Suporte](https://luidgivarela.github.io/desvape-legal/support.html)

Contato em todas as páginas: **desvape.suporte@gmail.com**.

## Desenvolvimento

Abra `index.html` diretamente ou sirva esta pasta com `python3 -m http.server 8000`. Acesse `http://localhost:8000`. Não é necessário instalar pacotes.

- `index.html`: landing page, FAQ nativa e estrutura de screenshots.
- `privacy.html`, `terms.html`: conteúdo legal original preservado, data e contato atualizados, navegação compartilhada.
- `support.html`: orientações e contato por e-mail.
- `styles.css`: identidade visual, responsividade e acessibilidade.
- `script.js`: ano, entrada sutil dos pilares e montagem opcional das capturas.
- `assets/README.md`: instruções para adicionar screenshots reais.

Header e footer são HTML em cada página para funcionar sem JavaScript. Ao alterar seus links, atualize as quatro páginas.

## Capturas e identidade

Não havia screenshots reais disponíveis. A versão inicial usa uma composição tipográfica editorial, sem fingir ser uma tela do app. Veja [como adicionar Home, Progresso e Perfil](assets/README.md). Não há mascote, favicon ou imagem Open Graph provisórios; as tags Open Graph de título, descrição, URL e locale já estão presentes.

Recursos apresentados foram conferidos no README do app (somente leitura). Não houve alteração no repositório do aplicativo. Os textos legais não passaram por revisão jurídica; o conteúdo existente foi mantido como base.

## GitHub Pages

Mantenha a origem de publicação atual. Para configuração por branch, use `main` e `/(root)` em Settings → Pages. Todos os caminhos internos são relativos, compatíveis com `/desvape-legal/` e com as URLs `.html` já utilizadas pelo app. Não há roteamento de SPA nem reescrita de URLs.

## Vercel

Importe **LuidgiVarela/desvape-legal** com Framework Preset **Other**. Root Directory: raiz do repositório. Sem Install Command, sem Build Command e Output Directory `.` (raiz). Não são necessárias variáveis de ambiente ou `vercel.json`. O site não usa funções de servidor.

Os canonical e `og:url` apontam para GitHub Pages, a publicação principal atual. Se migrar para domínio próprio, atualize esses endereços nas quatro páginas. Importar na Vercel não altera o GitHub Pages.

## Verificação manual

Confira desktop, tablet e celular; navegação e links legais; FAQ com teclado; foco e link “Pular para o conteúdo”; preferência de movimento reduzido. Os avisos “Em breve na App Store” são botões desabilitados: não simulam um link de download. Sem JS, os textos, links e FAQ continuam utilizáveis.
