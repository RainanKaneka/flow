# Estudos de peixes e interfaces do Flow

Estudos visuais de 2026-10-05, produzidos antes do esclarecimento da direção de arte. Este conjunto ilustrado foi preservado como estudo anterior.

O usuário esclareceu que a opção escolhida era **2D pixel art**. A direção vigente está no [novo conjunto em pixel art](../fish-pixel-art-2026-10-05/README.md).

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

O estudo dourado ilustrado usado como referência deste conjunto está em `referencias/peixe-dourado-aprovado.png`. As duas pranchas intermediárias usadas para compor a coleção também estão em `referencias/`.

## Direção do estudo

Arte em 2D com aquarela e lápis de cor, contornos suaves e expressões discretas. Cada espécie tem cores, corpo e nadadeiras diferentes, além de uma pose de perfil coerente para comparação. As imagens individuais incluem o fundo marfim do estudo; não são recortes transparentes nem sprites animados finais.

O aquário apresenta a cena da coleção, os detalhes do peixe selecionado, um nome personalizável e a escolha de companheiro para o perfil. A pesca apresenta o lago ilustrado, o lançamento da linha por bilhete e a última captura.

As interfaces seguem o sistema existente do Flow: superfícies escuras, destaque índigo, tipografia sem serifa, cantos arredondados e controles simples. Os textos, saldos, raridades e custo de pesca são exemplos para o conceito. Não representam funcionalidades já implementadas nem regras finais.

## Geração e conferência

Imagens geradas com a ferramenta nativa `image_gen`, usando a referência ilustrada. Orientação de UI pela skill local [ui-taste](../../ui-taste/SKILL.md) e pelo [DESIGN.md](../../../DESIGN.md).

Foram inspecionadas as imagens: dez peixes distintos, nomes na coleção, manutenção do estilo e composição das duas interfaces em desktop. Não foram implementadas telas, comportamentos, animações, acessibilidade interativa ou responsividade. Nenhum arquivo da aplicação foi alterado. As cópias dos PNGs foram conferidas por SHA-256.

O conjunto de prompts e suas imagens de referência está registrado em `prompts.json`. Os originais gerados foram preservados.
