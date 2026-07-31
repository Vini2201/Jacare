import { executeShopeeQuery } from '../client/shopeeClient.js';

export const PRODUCT_OFFER_V2_QUERY = `
query productOfferV2($productCatId: Int, $sortType: Int, $listType: Int, $page: Int, $limit: Int) {
  productOfferV2(productCatId: $productCatId, sortType: $sortType, listType: $listType, page: $page, limit: $limit) {
    nodes {
      itemId
      shopId
      productName
      shopName
      imageUrl
      priceMin
      priceMax
      priceDiscountRate
      sales
      ratingStar
      commissionRate
      periodStartTime
      periodEndTime
      productLink
      offerLink
      productCatIds
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
`;

export async function fetchProductOfferV2(params = {}) {
  return await executeShopeeQuery(PRODUCT_OFFER_V2_QUERY, {
    productCatId: params.productCatId || null,
    sortType: params.sortType !== undefined ? params.sortType : 2,
    listType: params.listType !== undefined ? params.listType : 1,
    page: params.page || 1,
    limit: params.limit || 20
  });
}
