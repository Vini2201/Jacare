import { executeShopeeQuery } from '../client/shopeeClient.js';

export const GENERATE_SHORT_LINK_MUTATION = `
mutation generateShortLink($originUrl: String!, $subId1: String, $subId2: String, $subId3: String, $subId4: String, $subId5: String) {
  generateShortLink(originUrl: $originUrl, subId1: $subId1, subId2: $subId2, subId3: $subId3, subId4: $subId4, subId5: $subId5) {
    shortLink
  }
}
`;

export async function generateShortLink(originUrl, subIds = {}) {
  return await executeShopeeQuery(GENERATE_SHORT_LINK_MUTATION, {
    originUrl,
    subId1: subIds.subId1 || 'jacare_telegram',
    subId2: subIds.subId2 || null,
    subId3: subIds.subId3 || null,
    subId4: subIds.subId4 || null,
    subId5: subIds.subId5 || null
  });
}
