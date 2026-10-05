# Revisão visual da etapa 3 — 2026-10-05

Renderizações locais dos componentes reais do Flow com coleção e saldos
ilustrativos, sem escrita em produção. Não são imagens de conceito nem
comprovação de um percurso interativo no executável Tauri.

- [Aquário, desktop escuro 1120 px](aquarium-dark.png).
- [Aquário, desktop claro 1024×768](aquarium-light.png).
- [Pesca, 1120 px](fishing.png).
- [Primeira captura gratuita, 1024×768](first-use.png).
- [Aquário em contêiner de 390 px](narrow.png).
- [Peixe companheiro no perfil](profile.png).

Na prévia estreita, o contêiner tem 390 px dentro de uma janela headless de
500 px, devido ao limite mínimo desse Chrome. A faixa vazia à direita pertence
ao ambiente de inspeção. A navegação principal mantém a rolagem horizontal
existente; conteúdo, fichas e abas do Refúgio se reorganizam na largura estreita.

Inspecionados: nitidez e transparência dos peixes, proporção de ambientes,
texto e hierarquia, claro/escuro, estados inicial e preenchido, organização
das ações e integração do favorito no perfil. Estados de erro, saldo zero,
reenvio e controles foram exercitados por testes automatizados de interface.
