import { executeShopeeQuery } from '../client/shopeeClient.js';

export const INTROSPECTION_QUERY = `
query IntrospectionQuery {
  __schema {
    queryType {
      fields {
        name
        description
        args {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
}
`;

export async function introspectShopeeSchema() {
  return await executeShopeeQuery(INTROSPECTION_QUERY);
}
