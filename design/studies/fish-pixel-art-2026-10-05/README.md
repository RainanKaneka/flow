# Peixes e interfaces do Flow em pixel art

Estudos visuais de 2026-10-05. O usuário esclareceu que a opção escolhida era **2D pixel art**. Este é o conjunto vigente de estudos para peixes, aquário e pesca.

- [Coleção dos dez peixes](colecao-completa.png)
- [Conceito do aquário](aquario-conceito.png)
- [Conceito da pesca](pesca-conceito.png)
- [Prompts e referências de cada imagem](prompts.json)

## Peixes

- [Betta Azul](01-betta-azul.png)
- [Carpa Koi](02-carpa-koi.png)
- [Guppy Aurora](03-guppy-aurora.png)
- [Tetra Néon](04-tetra-neon.png)
- [Acará-bandeira](05-acara-bandeira.png)
- [Peixe-palhaço](06-peixe-palhaco.png)
- [Baiacu Limão](07-baiacu-limao.png)
- [Peixe-mandarim](08-peixe-mandarim.png)
- [Bagre Mel](09-bagre-mel.png)
- [Disco Rubi](10-disco-rubi.png)

O douradinho pixelado da comparação inicial está em `referencias/peixe-dourado-pixel-aprovado.png` e foi usado como referência principal de estilo. As pranchas intermediárias e a composição anterior de UI usada como referência estão em `referencias/`.

## Direção visual

Peixes com pixels visíveis, contornos em degraus, grupos de cor definidos, expressões discretas e silhuetas distintas. As mesmas dez espécies do estudo anterior foram refeitas em pixel art. Os cenários do aquário e do lago também seguem esse estilo.

Os controles seguem o sistema existente do Flow: superfícies escuras, texto sem serifa, cantos arredondados e destaque índigo. O uso de pixel art se concentra nos peixes e no ambiente. Texto, navegação e campos continuam legíveis no estilo normal da aplicação.

O aquário mostra a coleção, nome do peixe e escolha de companheiro para o perfil. A pesca mostra o lago, lançamento por bilhete e última captura com acesso ao aquário. Saldos, raridades e custo de pesca são exemplos para o conceito, não regras finais nem funcionalidades já implementadas.

## Geração e conferência

Artes geradas com a ferramenta nativa `image_gen`. Orientação de interface pela skill local [ui-taste](../../ui-taste/SKILL.md) e pelo [DESIGN.md](../../../DESIGN.md).

Foram inspecionados os dez peixes, seus nomes na prancha e as duas interfaces conceituais de desktop. Uma área vazia na coleção do aquário foi corrigida com o Tetra Néon. Os originais gerados foram preservados, e as cópias dos PNGs foram conferidas por SHA-256.

Estas são imagens conceituais ampliadas. As artes individuais têm fundo marfim; ainda não são sprites recortados e animados para produção. A grade final, tamanhos de exportação e animações serão definidos na implementação. Não foram implementados comportamentos, responsividade ou acessibilidade interativa. Nenhum código da aplicação foi alterado.
