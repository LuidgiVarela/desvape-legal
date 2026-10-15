# Capturas reais do DesVape

Nenhuma captura real foi encontrada no repositório do site ou na cópia local do app durante esta implementação. Nenhum mascote foi incluído: o PNG disponível no app não correspondia ao pinguim solicitado. O ícone do app era indicado como provisório na documentação, portanto não foi adotado como favicon.

A arte tipográfica do hero é editorial, não representa a interface. A galeria de smartphones permanece oculta até receber capturas válidas. Não há placeholders de produto nem pedidos de arquivos inexistentes.

## Adicionar capturas

1. Capture telas reais e atualizadas do app, sem dados pessoais, banners de debug ou estados de assinatura de desenvolvimento. Priorize Home com pinguim e “Tempo sem vape”, Progresso e Perfil.
2. Salve `assets/home.png`, `assets/progress.png` e `assets/profile.png`. PNG ou WebP são aceitos; ajuste a extensão no passo seguinte. Preserve a interface e a proporção. Recomenda-se 600–900 px de largura e menos de 400 KB por imagem quando possível.
3. Em `script.js`, substitua `const screenshots = [];` pelo exemplo abaixo, informando as **dimensões reais** e ajustando os textos alternativos à captura:

```js
const screenshots = [
  { src: 'assets/home.png', width: 750, height: 1624,
    alt: 'Tela inicial do DesVape com o pinguim e o tempo sem vape',
    label: 'Home · Seu dia, no seu ritmo', hero: true },
  { src: 'assets/progress.png', width: 750, height: 1624,
    alt: 'Tela de progresso do DesVape com a evolução dos registros',
    label: 'Progresso · Um olhar para o caminho' },
  { src: 'assets/profile.png', width: 750, height: 1624,
    alt: 'Tela de perfil do DesVape',
    label: 'Perfil · Um espaço seu' }
];
```

Use `hero: true` somente na Home. A imagem substitui a arte editorial quando carregada; a galeria aparece automaticamente. Sem JS, o conteúdo editorial continua disponível. As molduras são CSS, sem cortar ou redesenhar a UI, com composição de três aparelhos no desktop e stack no mobile. Não é necessário adicionar notch sobre a captura.

Se o pinguim oficial for disponibilizado posteriormente, use o arquivo aprovado sem redesenhá-lo. Não reutilize `companion-v1.png` sem confirmar a identidade.
