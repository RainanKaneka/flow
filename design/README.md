# Design e recompensas do Flow

O usuário definiu **ui-taste** como skill de design do projeto. Ler
[ui-taste/SKILL.md](ui-taste/SKILL.md) e os playbooks pertinentes antes de
trabalhar em interfaces. A licença, NOTICE e referências do pacote público
foram preservados. As decisões específicas do Flow estão em [DESIGN.md](../DESIGN.md).

## Etapa 1

- [Protótipo navegável do Refúgio](prototypes/refugio/index.html).
- [Especificação e migração](../docs/recompensas-etapa-1.md).
- [Regras v1](rewards-rules.v1.json).
- [Verificação realizada](verificacao-etapa-1.md).
- [Prévia desktop](previews/refugio/desktop-refugio.png).
- [Prévia estreita](previews/refugio/mobile-refugio.png).

Abrir `prototypes/refugio/index.html` no navegador. Para servir localmente,
na raiz de `flow-app` executar:

```powershell
python -m http.server 3431 --bind 127.0.0.1 --directory design/prototypes/refugio
```

Acessar `http://127.0.0.1:3431`. O protótipo não usa Firebase, não altera a
rotina real e reinicia seus dados ao recarregar. As fontes remotas têm fallback
local; os demais assets são locais.

Concluir uma tarefa, aguardar cinco segundos, abrir Catálogo e desbloquear
Sálvia. O seletor de cenários e os controles de simulação são exclusivos
deste estudo. O pet é uma prévia visual; pesca ainda não está disponível.

Para conferir os valores da economia:

```powershell
node design/simular-economia.mjs
```
