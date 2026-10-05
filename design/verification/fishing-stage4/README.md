# Revisão visual da etapa 4 — 2026-10-05

Renderizações locais dos componentes reais, com coleção e saldos ilustrativos
identificados na tela. Não são conceitos de imagem nem evidência de um percurso
interativo no executável Tauri. Nenhum dado de usuário ou produção foi alterado.

- [Aquário escuro, 1120×1600](aquarium-dark.png): placas e decorações, ficha e seleção.
- [Personalização, 1120×2100](customization.png): aquário, controles, loja e marcos.
- [Fisgada aguardando confirmação, 1120×1200](fishing-bite.png).
- [Aquário claro, 1024×1200](aquarium-light.png).
- [Aquário em contêiner de 390 px](narrow.png).
- [Personalização em contêiner de 390 px](shop-narrow.png).
- [Companheiro no perfil, 1120×1000](profile.png).

A fixture contém onze espécies, quantidades de maestria de exemplo, três
decorações e todos os itens possuídos. Carteira: 1.240 XP, 85 moedas e três
bilhetes. Os totais não representam progresso real. O movimento foi desligado
para inspecionar a composição estática; estas imagens não comprovam animações.

Chrome headless serviu somente para renderizar páginas locais em um perfil de
teste isolado. A versão disponível impõe largura mínima de 500 px; nas duas
capturas estreitas, o conteúdo tem 390 px dentro dessa janela. A faixa vazia à
direita é do ambiente de inspeção. Capturas altas mostram conteúdo rolável;
a cena mantém a proporção 5:3 em janelas menores. A navegação principal conserva
sua rolagem horizontal existente na largura estreita.

Inspecionados: transparência e nitidez das artes, composição das decorações,
placas abaixo dos peixes, molduras, hierarquia da loja, contraste nos dois temas,
quebra de texto e reorganização dos controles. Dois problemas encontrados na
revisão foram corrigidos: placas comprimidas ao lado dos peixes e personalização
aquática posicionada depois das aparências antigas.

Teclado, espera, pausa, confirmação, compra, equipagem e títulos foram exercitados
por testes automatizados com ações reais do modo convidado. Estado de erro,
saldo insuficiente e recuperação também têm testes de regras/runtime. A
validação com pessoas e o percurso nativo no desktop pertencem à etapa 5.
