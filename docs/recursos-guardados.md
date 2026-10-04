# IA e monetização desativadas

A versão atual do Flow não oferece planos, assinaturas, cotas ou recursos de IA. Os recursos de rotina, calendário, Pomodoro, notas, backlog, estatísticas, perfil, backups e sincronização opcional permanecem disponíveis.

`src/config/productFeatures.ts` mantém `aiAssistant` e `monetization` desativados. Isso controla as abas, os botões, a busca global, os atalhos, os modais e a renovação automática de tokens da integração Gemini. Navegar para a antiga aba de IA volta à rotina. O callback OAuth da integração Gemini também não é processado nessa versão.

Os componentes, serviços, tipos, histórico de chat e configurações da implementação anterior foram preservados. Os campos antigos de plano e cota não aparecem na interface e não são alterados ao editar um perfil existente.

As Cloud Functions e regras existentes foram preservadas para referência e não foram implantadas nem alteradas nesta atualização. A função de proxy de IA continua contendo a política antiga de plano pago; qualquer retomada requer revisar essa política e a configuração do backend antes de habilitar a funcionalidade.

No repositório `flow-landing`, as versões anteriores das seções comerciais estão em `archive/monetization`, fora do código compilado. O site atual não importa essas seções e não anuncia IA ou planos. Para uma retomada futura, revisar também o material de divulgação e os assets históricos.
