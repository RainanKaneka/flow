/**
 * Script utilitário: setup-dev-premium.ts
 * Inicializa ou promove um usuário para o plano PREMIUM no Firestore
 * Útil para testes de desenvolvimento (local com emulador ou ambiente de homologação)
 *
 * Execução:
 *   npx tsx scripts/setup-dev-premium.ts [userId] [plan]
 * Exemplo:
 *   npx tsx scripts/setup-dev-premium.ts dev-test-user premium
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Configura porta default do emulador do Firestore se não estiver definida
if (!process.env.FIRESTORE_EMULATOR_HOST && process.env.NODE_ENV !== 'production') {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
}

if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'flow-routine-app',
  });
}

export interface SetupDevUserOptions {
  plan?: 'free' | 'premium';
  displayName?: string;
  email?: string;
  monthlyLimit?: number;
}

/**
 * Função utilitária para inicializar ou atualizar um perfil de usuário no Firestore
 */
export async function setupDevUser(
  userId: string = 'dev-test-user',
  options: SetupDevUserOptions = {}
) {
  const db = getFirestore();
  const plan = options.plan || 'premium';
  const isPremium = plan === 'premium';
  const displayName = options.displayName || (isPremium ? 'Dev Premium User' : 'Dev Free User');
  const email = options.email || `${userId}@flow.local`;
  const monthlyLimit = options.monthlyLimit ?? (isPremium ? 99999 : 1000);

  const userDocRef = db.doc(`users/${userId}`);

  const userData = {
    displayName,
    email,
    plan,
    premiumSince: isPremium ? new Date().toISOString() : null,
    premiumUntil: null,
    aiQuota: {
      monthlyLimit,
      used: 0,
      resetDate: '2099-01-01',
      totalTokensConsumed: 0,
    },
    profile: {
      name: displayName,
      objective: 'Foco total e produtividade no Flow',
      plan,
      avatarPreset: isPremium ? 'rocket' : 'spark',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    updatedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  await userDocRef.set(userData, { merge: true });

  return userData;
}

// Execução direta via CLI
async function main() {
  const args = process.argv.slice(2);
  const targetUid = args[0] || 'dev-test-user';
  const targetPlan = (args[1] as 'free' | 'premium') || 'premium';

  console.log(`\n🚀 [Flow Setup Dev] Configurando usuário no Firestore...`);
  console.log(`👤 Target UID : ${targetUid}`);
  console.log(`💎 Target Plan: ${targetPlan.toUpperCase()}`);
  console.log(`🌐 Firestore  : ${process.env.FIRESTORE_EMULATOR_HOST || 'Nuvem Oficial (Google Cloud)'}`);

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `Tempo limite atingido ao tentar conectar ao Firestore (${
                process.env.FIRESTORE_EMULATOR_HOST || 'Cloud'
              }).\nCertifique-se de que o emulador está rodando ("firebase emulators:start") ou que as credenciais do Firebase estão configuradas.`
            )
          ),
        4000
      )
    );

    const result = (await Promise.race([
      setupDevUser(targetUid, { plan: targetPlan }),
      timeoutPromise,
    ])) as any;

    console.log(`\n✅ Usuário "${targetUid}" configurado com sucesso!`);
    console.log(`   Plano        : ${result.plan}`);
    console.log(`   Limite Quota : ${result.aiQuota.monthlyLimit} requisições/mês`);
    console.log(`   Reset Data   : ${result.aiQuota.resetDate}`);
    console.log(`   Nome Exibição: ${result.displayName}`);
    console.log(`\n💡 Pronto para testar o aiProxy sem restrições de pagamento! 🎉\n`);
  } catch (err: any) {
    console.error(`\n⚠️  Aviso: ${err?.message || err}\n`);
    process.exit(1);
  }
}

if (require.main === module || process.argv[1]?.includes('setup-dev-premium')) {
  main();
}
