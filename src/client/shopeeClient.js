import fs from 'fs';
import path from 'path';
import { generateShopeeAuthHeaders } from './shopeeAuth.js';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0) {
          process.env[key.trim()] = vals.join('=').trim();
        }
      }
    });
  }
}

loadEnv();

const SHOPEE_APP_ID = process.env.SHOPEE_APP_ID || '';
const SHOPEE_SECRET_KEY = process.env.SHOPEE_SECRET_KEY || '';
const GRAPHQL_URL = process.env.SHOPEE_GRAPHQL_URL || 'https://open-api.affiliate.shopee.com.br/graphql';

const isDummyConfig = !SHOPEE_APP_ID || !SHOPEE_SECRET_KEY || SHOPEE_APP_ID === 'seu_app_id_aqui';

export async function executeShopeeQuery(query, variables = {}, maxRetries = 2) {
  if (isDummyConfig) {
    return {
      responseTimeMs: 0,
      status: 200,
      data: null,
      errors: [{ message: 'SHOPEE_APP_ID e SHOPEE_SECRET_KEY não configurados no .env' }]
    };
  }

  const payloadStr = JSON.stringify({ query, variables });
  let attempt = 0;
  let delayMs = 1000;

  while (attempt <= maxRetries) {
    attempt++;
    const startTime = Date.now();

    try {
      const headers = generateShopeeAuthHeaders(SHOPEE_APP_ID, SHOPEE_SECRET_KEY, payloadStr);

      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers,
        body: payloadStr
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json();

      const hasThrottleError = data.errors && data.errors.some(err => {
        const code = err.extensions?.code || err.code;
        return code === 10020 || code === 10030 || (err.message && err.message.toLowerCase().includes('rate limit'));
      });

      if (hasThrottleError && attempt <= maxRetries) {
        console.warn(`⏳ [Rate Limit Shopee] Tentativa ${attempt} atingiu throttle. Aguardando ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
        delayMs *= 2;
        continue;
      }

      console.log(`ℹ️ [GraphQL Request] status=${response.status} | tempo=${responseTime}ms | tentativa=${attempt}`);

      return {
        responseTimeMs: responseTime,
        status: response.status,
        data: data.data || null,
        errors: data.errors || null
      };

    } catch (err) {
      if (attempt <= maxRetries) {
        console.warn(`⚠️ [Erro de Rede] ${err.message}. Retentando...`);
        await new Promise(res => setTimeout(res, delayMs));
        delayMs *= 2;
      } else {
        throw err;
      }
    }
  }
}
