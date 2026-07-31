import crypto from 'crypto';

/**
 * Assinatura Oficial Shopee Affiliate Open API (GraphQL)
 * Signature = SHA256 ( AppId + Timestamp + PayloadStr + SecretKey )
 */
export function generateShopeeAuthHeaders(appId, secretKey, payloadStr) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const factorStr = `${appId}${timestamp}${payloadStr}${secretKey}`;
  
  const signature = crypto
    .createHash('sha256')
    .update(factorStr)
    .digest('hex');

  const authHeader = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`;

  return {
    'Content-Type': 'application/json',
    'Authorization': authHeader
  };
}
