# Revisão visual do backup — etapa 5

Capturas do componente real `BackupModal` em uma fixture local com nomes e tamanhos
de arquivo ilustrativos. Nenhum backup do usuário foi lido ou alterado.

- [Escuro, 1120 × 800](dark-1120.png)
- [Claro, 1024 × 768](light-1024.png)
- [Conteúdo estreito, 390 px](narrow-390.png)

Na captura estreita, o Edge headless usou uma janela física de 500 px; a fixture
limitou o diálogo a 390 px. A faixa vazia à direita não pertence ao Flow.
O modal mantém título, abas, estado, pasta e ação acessíveis, com rolagem vertical.
O arquivo antigo `.db` é identificado como “Somente rotina”, enquanto a pasta
`.flowbackup` é identificada como “Rotina + Refúgio”.

Esta inspeção confirma composição e legibilidade renderizadas, não o funcionamento
do seletor de pastas ou a restauração no executável Tauri. Os testes de interface
cobrem as ações; o teste nativo de SQLite confere o conteúdo do backup.
