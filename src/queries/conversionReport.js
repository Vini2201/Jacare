import { executeShopeeQuery } from '../client/shopeeClient.js';

export const CONVERSION_REPORT_QUERY = `
query conversionReport($purchaseTimeStart: Int, $purchaseTimeEnd: Int, $page: Int, $limit: Int) {
  conversionReport(purchaseTimeStart: $purchaseTimeStart, purchaseTimeEnd: $purchaseTimeEnd, page: $page, limit: $limit) {
    nodes {
      orders {
        orderId
        purchaseTime
        totalCommission
        subId1
        subId2
        subId3
      }
    }
    pageInfo {
      page
      limit
      hasNextPage
    }
  }
}
`;

export async function fetchConversionReport(startTime, endTime, page = 1, limit = 20) {
  return await executeShopeeQuery(CONVERSION_REPORT_QUERY, {
    purchaseTimeStart: startTime,
    purchaseTimeEnd: endTime,
    page,
    limit
  });
}
