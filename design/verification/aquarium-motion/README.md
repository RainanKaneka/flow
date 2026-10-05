# Revisão do movimento do aquário — 2026-10-05

Capturas locais dos componentes reais do Flow com coleção e saldos ilustrativos.
O aquário foi renderizado em dois momentos distintos do nado, e uma composição
estreita mostra posições salvas manualmente na fixture.

- [Início do nado em 1120 px](motion-early.png).
- [Nado alguns segundos depois em 1120 px](motion-later.png).
- [Posições em contêiner de 390 px](moved-narrow.png).

As duas primeiras imagens mostram peixes em posições e orientações diferentes,
com pixels nítidos e placas legíveis. Na terceira, a janela headless tem 500 px,
mas o conteúdo do aplicativo mede 390 px; a faixa vazia à direita pertence à
janela de teste. A fixture não usa dados de produção.

A inspeção visual confere a composição, a nitidez e a ausência de fundo visível
atrás dos peixes nas capturas. A regra de hover foi inspecionada no CSS; o
navegador interativo não estava disponível para uma captura com cursor sobre o
peixe. Testes de interface exercitam arraste e setas. Testes do movimento cobrem
passos pequenos, virada na borda e limites da cena. O executável Tauri ainda
precisa de um percurso manual antes do lançamento.
