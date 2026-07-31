import { executeShopeeQuery } from '../client/shopeeClient.js';

/**
 * Mapeamento abrangente de nichos estratégicos da Shopee para o "Jacaré das Promos".
 * Inclui produtos de alto ticket (Notebooks, Lavadora, TV), médio ticket e achadinhos de baixo ticket (Café, Acessórios).
 */
export const CATEGORIAS_EXPANDIDAS = [
  // 💻 ALTO TICKET / TECNOLOGIA & GAMES
  { id: 100044, nome: "💻 Informática & Notebooks", minVendas: 50, ticketMin: 200, descMin: 10, keywords: ["notebook", "ssd", "monitor", "teclado gamer"] },
  { id: 100013, nome: "📱 Celulares & Smartphones", minVendas: 100, ticketMin: 300, descMin: 15, keywords: ["iphone", "xiaomi", "samsung", "motorola"] },
  { id: 100015, nome: "🎮 Consoles & Games", minVendas: 50, ticketMin: 100, descMin: 10, keywords: ["ps5", "xbox", "nintendo switch", "controle"] },
  
  // 🏠 ELETRODOMÉSTICOS & CASA (Alto e Médio Ticket)
  { id: 100055, nome: "🏠 Eletrodomésticos Grandes & Lavadoras", minVendas: 30, ticketMin: 200, descMin: 15, keywords: ["maquina de lavar", "geladeira", "ar condicionado", "lava louça"] },
  { id: 100018, nome: "🍳 Portáteis de Cozinha & Air Fryer", minVendas: 100, ticketMin: 50, descMin: 20, keywords: ["air fryer", "cafeteira", "aspirador robo", "microondas"] },
  
  // ☕ ALIMENTOS, CAFÉ & ACHADINHOS (Baixo Ticket / Alto Volume)
  { id: 100020, nome: "☕ Alimentos & Bebidas (Café, Cápsulas, Achadinhos)", minVendas: 200, ticketMin: 10, descMin: 25, keywords: ["cafe", "capsula nespresso", "dolce gusto", "chocolate", "whey"] },
  
  // 🎵 ÁUDIO & ELETRÔNICOS
  { id: 100034, nome: "🎵 Áudio & Caixas de Som", minVendas: 100, ticketMin: 30, descMin: 20, keywords: ["fone bluetooth", "jbl", "soundbar", "caixa de som"] },
  
  // 💄 BELEZA & PERFUMARIA
  { id: 100029, nome: "💄 Perfumaria & Cuidados Pessoais", minVendas: 150, ticketMin: 20, descMin: 30, keywords: ["perfume", "natura", "boticario", "secador"] },

  // 👕 MODA & ESPORTE (Apenas se tiver desconto relevante)
  { id: 100010, nome: "👕 Moda Masculina & Streetwear", minVendas: 200, ticketMin: 25, descMin: 35, keywords: ["tenis", "nike", "adidas", "moletom", "camisa de time"] },
  { id: 100008, nome: "👗 Moda Feminina", minVendas: 200, ticketMin: 25, descMin: 35, keywords: ["vestido", "bolsa", "sapato", "maquiagem"] },
  { id: 100058, nome: "⚽ Esporte & Fitness", minVendas: 100, ticketMin: 30, descMin: 25, keywords: ["suplemento", "creatina", "bicicleta", "haltere"] }
];

export async function fetchCategoryProducts(catId, keyword = null) {
  const query = `
    query productOfferV2($productCatId: Int, $keyword: String, $sortType: Int, $listType: Int, $page: Int, $limit: Int) {
      productOfferV2(productCatId: $productCatId, keyword: $keyword, sortType: $sortType, listType: $listType, page: $page, limit: $limit) {
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

  return await executeShopeeQuery(query, {
    productCatId: catId || null,
    keyword: keyword || null,
    sortType: 2, // Maior comissão / Melhores ofertas
    listType: 1,
    page: 1,
    limit: 20
  });
}
