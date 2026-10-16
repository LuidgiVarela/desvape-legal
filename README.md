# DesVape — site oficial

Landing page estática, páginas legais e suporte. HTML, CSS e JavaScript nativos, sem backend, rastreamento, fontes externas ou etapa de build. O mascote reutiliza o visualizador Three.js fornecido, carregado apenas sob demanda.

## Páginas públicas

- [Início](https://luidgivarela.github.io/desvape-legal/)
- [Privacidade](https://luidgivarela.github.io/desvape-legal/privacy.html)
- [Termos](https://luidgivarela.github.io/desvape-legal/terms.html)
- [Suporte](https://luidgivarela.github.io/desvape-legal/support.html)

Contato em todas as páginas: **desvape.suporte@gmail.com**.

## Desenvolvimento

Abra `index.html` diretamente ou sirva esta pasta com `python3 -m http.server 8000`. Acesse `http://localhost:8000`. Não é necessário instalar pacotes.

- `index.html`: landing page, demonstração real em vídeo, mascote interativo opcional e FAQ nativa.
- `privacy.html`, `terms.html`: conteúdo legal original preservado, data e contato atualizados, navegação compartilhada.
- `support.html`: orientações e contato por e-mail.
- `styles.css`: identidade visual, responsividade e acessibilidade.
- `script.js`: ano, entrada sutil dos pilares, controles de vídeo e integração sob demanda do mascote.
- `assets/README.md`: inventário dos assets, processamento do vídeo e detalhes do mascote/fallback.

Header e footer são HTML em cada página para funcionar sem JavaScript. Ao alterar seus links, atualize as quatro páginas.

## Mídia e identidade

A logo fornecida (`assets/penguin-mark-proposal.svg`) aparece na hero e na navegação de todas as páginas. O vídeo real do app foi otimizado para web, removendo apenas a moldura do simulador; o original permanece intacto. A reprodução usa cerca de 304 KB, com poster de aproximadamente 57 KB. O `<video>` possui autoplay silencioso, loop, reprodução inline e botão de pausa. Movimento reduzido, economia de dados, viewport e visibilidade da aba controlam a reprodução.

O pinguim GLB e seu viewer já vieram nos assets. São carregados somente após clicar em “Conhecer o pinguim”, sem som ou animação contínua. A logo permanece como fallback em falhas e no acesso por arquivo local. Para testar o 3D, sirva o site via HTTP. Não é preciso instalar bibliotecas.

Veja [o inventário e as instruções de manutenção](assets/README.md), incluindo os arquivos que foram preservados mas não utilizados. Os recursos e os textos legais existentes foram mantidos; somente o repositório do site foi alterado.

## GitHub Pages

Mantenha a origem de publicação atual. Para configuração por branch, use `main` e `/(root)` em Settings → Pages. Todos os caminhos internos são relativos, compatíveis com `/desvape-legal/` e com as URLs `.html` já utilizadas pelo app. Não há roteamento de SPA nem reescrita de URLs.

## Vercel

Importe **LuidgiVarela/desvape-legal** com Framework Preset **Other**. Root Directory: raiz do repositório. Sem Install Command, sem Build Command e Output Directory `.` (raiz). Não são necessárias variáveis de ambiente ou `vercel.json`. O site não usa funções de servidor.

Os canonical e `og:url` apontam para GitHub Pages, a publicação principal atual. Se migrar para domínio próprio, atualize esses endereços nas quatro páginas. Importar na Vercel não altera o GitHub Pages.

## Verificação manual

Confira desktop, tablet e celular; navegação e links legais; FAQ com teclado; foco e link “Pular para o conteúdo”; preferência de movimento reduzido. Os avisos “Em breve na App Store” são botões desabilitados: não simulam um link de download. Sem JS, os textos, links e FAQ continuam utilizáveis.


## Testes

`node --test tests/media.test.cjs` valida o comportamento dos controles de mídia, pausas automáticas, carregamento adiado e fallback do mascote sem instalar dependências. Esses testes não substituem a inspeção visual em um navegador com WebGL.

Na atualização com mídia, os arquivos, links e codecs foram verificados. O ambiente de execução bloqueou a abertura do servidor HTTP e do Chrome; portanto, a inspeção visual local de desktop/tablet/mobile e da renderização WebGL permanece pendente. Para fazê-la, execute o servidor acima e confira também movimento reduzido, JavaScript desativado e falha no carregamento do GLB.
