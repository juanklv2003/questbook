import 'dotenv/config';
import { env } from './src/config/env';
import { GeminiFailover, isQuotaExhausted } from './src/core/ai/GeminiFailover';

const mask = (k: string) => (k ? k.slice(0, 6) + '…' + k.slice(-4) : '(empty)');

async function main() {
  // 1) env
  console.log('=== GEMINI_API_KEYS (env) ===');
  console.log('count:', env.GEMINI_API_KEYS.length);
  env.GEMINI_API_KEYS.forEach((k, i) => console.log(`key[${i}]:`, mask(k)));

  // 2) isQuotaExhausted
  console.log('\n=== isQuotaExhausted ===');
  const e429: any = new Error('RESOURCE_EXHAUSTED'); e429.status = 429;
  const eMsg: any = new Error('429 quota exceeded');
  const e400: any = new Error('invalid API key'); e400.status = 400;
  console.log('429 status:', isQuotaExhausted(e429));
  console.log('msg quota:', isQuotaExhausted(eMsg));
  console.log('400 status:', isQuotaExhausted(e400));

  // 3) failover simulation: primera clave falla por cuota, segunda funciona
  console.log('\n=== failover (1ª clave con 429, 2ª OK) ===');
  const fake = new GeminiFailover(['KEY_A_FAKE', 'KEY_B_FAKE']);
  let calls = 0;
  const result = await fake.withFailover(async () => {
    calls++;
    if (calls === 1) { const err: any = new Error('RESOURCE_EXHAUSTED'); err.status = 429; throw err; }
    return 'ok-from-key2';
  });
  console.log('result:', result, '| llamadas:', calls);
  console.log('currentIndex ahora apunta a 1 =', (fake as any).currentIndex);

  // 4) error no-cuota NO debe provocar reintento
  console.log('\n=== error no-cuota (400) no reintenta ===');
  const fake2 = new GeminiFailover(['KEY_A_FAKE', 'KEY_B_FAKE']);
  let calls2 = 0;
  try {
    await fake2.withFailover(async () => { calls2++; throw Object.assign(new Error('invalid key'), { status: 400 }); });
  } catch (e: any) {
    console.log('lanzó:', e.message, '| llamadas:', calls2, '(esperado 1)');
  }

  // 5) todas agotadas -> mensaje claro
  console.log('\n=== todas agotadas (429 en todas) ===');
  const fake3 = new GeminiFailover(['KEY_A_FAKE', 'KEY_B_FAKE']);
  try {
    await fake3.withFailover(async () => { throw Object.assign(new Error('quota'), { status: 429 }); });
  } catch (e: any) {
    console.log('lanzó:', e.message);
  }
}

main().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });