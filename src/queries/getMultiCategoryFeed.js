import { executeShopeeQuery } from '../client/shopeeClient.js';

export const MATRIZ_NICHOS = [
  { id: 100030, nome: "🚗 Automotivo, Pneus & Acessórios", keywords: ["pneu", "capacete", "led automotivo"], ticketMin: 5, minVendas: 1 },
  { id: 100044, nome: "🖥️ PC Gamer, Hardware & Monitores", keywords: ["notebook", "ssd", "monitor", "teclado"], ticketMin: 5, minVendas: 1 },
  { id: 100015, nome: "🎮 Videogames, Consoles & Jogos", keywords: ["ps5", "xbox", "controle"], ticketMin: 5, minVendas: 1 },
  { id: 100013, nome: "📱 Celulares & Acessórios", keywords: ["iphone", "xiaomi", "samsung"], ticketMin: 5, minVendas: 1 },
  { id: 100055, nome: "🏠 Eletrodomésticos Grandes & Lavadoras", keywords: ["maquina de lavar", "air fryer", "microondas"], ticketMin: 5, minVendas: 1 },
  { id: 100018, nome: "☕ Cozinha, Cafeteiras & Café", keywords: ["cafe", "cafeteira", "mixer"], ticketMin: 2, minVendas: 1 },
  { id: 100034, nome: "🎵 Áudio & Caixas de Som", keywords: ["fone", "jbl", "soundbar"], ticketMin: 5, minVendas: 1 },
  { id: 100048, nome: "🧰 Ferramentas & Oficina", keywords: ["parafusadeira", "furadeira"], ticketMin: 5, minVendas: 1 },
  { id: 100058, nome: "⚽ Esporte, Tênis & Suplementos", keywords: ["tenis", "creatina", "whey"], ticketMin: 5, minVendas: 1 },
  { id: 100029, nome: "💄 Perfumaria & Cuidados", keywords: ["perfume", "natura", "secador"], ticketMin: 5, minVendas: 1 }
];

export async function executeMultiCategoryQuery(nicho) {
  const query = `
    query productOfferV2($productCatId: Int, $keyword: String, $page: Int, $limit: Int) {
      productOfferV2(productCatId: $productCatId, keyword: $keyword, page: $page, limit: $limit) {
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
      }
    }
  `;

  let combinedNodes = [];

  // Busca por Categoria ID
  if (nicho.id) {
    const resId = await executeShopeeQuery(query, {
      productCatId: nicho.id,
      page: 1,
      limit: 15
    });
    if (resId?.data?.productOfferV2?.nodes) {
      combinedNodes = [...combinedNodes, ...resId.data.productOfferV2.nodes];
    }
  }

  // Busca adicional por palavras-chave do nicho
  if (nicho.keywords) {
    for (const kw of nicho.keywords) {
      const resKw = await executeShopeeQuery(query, {
        keyword: kw,
        page: 1,
        limit: 10
      });
      if (resKw?.data?.productOfferV2?.nodes) {
        combinedNodes = [...combinedNodes, ...resKw.data.productOfferV2.nodes];
      }
    }
  }

  const uniqueNodes = [];
  const map = new Map();
  for (const item of combinedNodes) {
    if (!map.has(item.itemId)) {
      map.set(item.itemId, true);
      uniqueNodes.push(item);
    }
  }

  return uniqueNodes;
}
