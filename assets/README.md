# Assets do DesVape

## Arquivos utilizados

| Arquivo | Uso |
| --- | --- |
| `penguin-mark-proposal.svg` | Logo fornecida, usada na navegação, hero, rodapé, favicon e fallback do pinguim. O nome original foi preservado. |
| `Desvape_Site_Demo_v1 (1).mp4` | Gravação original: H.264, 720 × 1558, 9,9 s, 425.759 bytes. Preservada sem alterações. |
| `desvape-demo.web.mp4` | Versão web: H.264, 648 × 1418, 24 fps, sem áudio, faststart. Apenas a moldura externa/barra do simulador foi removida; a interface não foi reconstruída nem alterada. |
| `desvape-demo-poster.jpg` | Primeiro frame da versão web, usado como poster e quando o vídeo está pausado. |
| `mascot3d/companion.glb` | Modelo original, glTF 2.0 autocontido, sem texturas externas, cerca de 108 KB. |
| `mascot3d/viewer.html` e `mascot3d/viewer.bundle.js` | Visualizador Three.js fornecido. Carregado somente após clicar em “Conhecer o pinguim”. |
| `mascot3d/vendor/LICENSE-three.txt` | Licença MIT do Three.js já incluído no visualizador. |

## Vídeo

Um único `<video autoplay muted loop playsinline preload="metadata">` aparece na hero, em moldura CSS. A proporção é preservada, sem sobrepor notch ou textos à tela. Um botão permite pausar/reproduzir. O vídeo pausa fora da viewport e quando a aba fica oculta. `prefers-reduced-motion` e `navigator.connection.saveData` desativam a reprodução automática via JavaScript; o usuário ainda pode iniciar manualmente. Sem JavaScript, há link para abrir o vídeo nos controles do navegador.

Recriar os derivados a partir do original (requer FFmpeg apenas para esta manutenção, nunca para publicar):

```sh
ffmpeg -i 'assets/Desvape_Site_Demo_v1 (1).mp4' \
  -vf 'crop=648:1418:36:98,fps=24' -c:v libx264 -preset slow \
  -crf 25 -pix_fmt yuv420p -an -movflags +faststart assets/desvape-demo.web.mp4
ffmpeg -ss 0 -i assets/desvape-demo.web.mp4 \
  -frames:v 1 -q:v 3 -update 1 assets/desvape-demo-poster.jpg
```

Se trocar a gravação, ajuste o recorte à nova resolução e confira o início/fim antes de publicar. O cursor visível faz parte da gravação original. Uma captura futura feita diretamente no aparelho, sem cursor, pode melhorar o acabamento.

## Mascote

A integração usa a API `window.desvapeMascot` do visualizador fornecido, dentro de um iframe local. O site lê o GLB somente após interesse do visitante e o entrega ao viewer como base64. O modelo fica estático (`motion: false`); o controle de ângulo funciona com mouse, toque e teclado, sem loop de animação contínuo. A renderização respeita visibilidade da seção/aba. Sem WebGL, com falha de rede ou timeout, a logo do pinguim permanece e é possível tentar novamente. Sem JS ou em `file://`, o fallback permanece visível.

Nenhuma biblioteca foi instalada. Nenhum CDN é usado. O bundle existente inclui Three.js e o loader; seu carregamento é adiado. Os arquivos originais do viewer não foram modificados.

## Arquivos preservados, mas não carregados pelo site

- `mascot/companion-v1.png`: personagem anterior, diferente do pinguim da logo/vídeo/GLB. Não foi usado para evitar misturar identidades.
- `mascot3d/greeting.wav` e `mascot3d/sounds/*.wav`: sons do app; o site fica silencioso.
- `mascot3d/vendor/*.js`: fontes/dependências da versão original, já incorporadas em `viewer.bundle.js`. Não são carregadas separadamente.
- O MP4 original permanece disponível para manutenção/fallback; a reprodução usa a versão web menor.

## Capturas futuras

Se adicionar uma galeria, prefira capturas reais em `assets/home.png`, `assets/progress.png` e `assets/profile.png`, sem dados pessoais ou banners de debug. A antiga galeria vazia foi substituída pelo vídeo real; não há mais um array de screenshots para preencher. Não invente telas ou resultados.
