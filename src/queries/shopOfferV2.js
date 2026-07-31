import { executeShopeeQuery } from '../client/shopeeClient.js';

export const SHOP_OFFER_V2_QUERY = `
query shopOfferV2($keyword: String, $page: Int, $limit: Int) {
  shopOfferV2(keyword: $keyword, page: $page, limit: $limit) {
    nodes {
      shopId
      shopName
      shopType
      commissionRate
      sellerCommissionRate
      offerLink
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
`;

export async function fetchShopOfferV2(params = {}) {
  return await executeShopeeQuery(SHOP_OFFER_V2_QUERY, {
    keyword: params.keyword || null,
    page: params.page || 1,
    limit: params.limit || 10
  });
}
