import fs from 'fs';
import path from 'path';
import { fetchProductOfferV2 } from '../queries/productOfferV2.js';

const MOCK_COMPARISON = [
  {
    productName: 'Cadeira Gamer Ergonômica Reclinável',
    price: '799.00',
    shopeeCommissionRate: '0.05',
    sellerCommissionRate: '0.10',
    totalRateStr: '0.15'
  },
  {
    productName: 'Capa de Celular Capinha Silicone',
    price: '12.00',
    shopeeCommissionRate: '0.20',
    sellerCommissionRate: '0.30',
    totalRateStr: '0.50'
  },
  {
    productName: 'Aspirador de Pó Robô Inteligente',
    price: '450.00',
    shopeeCommissionRate: '0.08',
    sellerCommissionRate: '0.12',
    totalRateStr: '0.20'
  }
];

export async function compareCommissions() {
  console.log('📊 [Jacaré das Promos] Comparando Comissões (% vs R$ Absoluto)...\n');

  let res;
  try {
    res = await fetchProductOfferV2({ sortType: 2, limit: 10 });
  } catch (e) {
    console.error('Erro na consulta:', e.message);
  }

  const nodes = (res && res.data && res.data.productOfferV2 && res.data.productOfferV2.nodes) 
    ? res.data.productOfferV2.nodes 
    : MOCK_COMPARISON;

  const processed = nodes.map(item => {
    const price = parseFloat(item.price || '0');
    const shopeeRate = parseFloat(item.shopeeCommissionRate || '0');
    const sellerRate = parseFloat(item.sellerCommissionRate || '0');
    const totalRate = parseFloat(item.commissionRate || item.totalRateStr || (shopeeRate + sellerRate).toString());

    const commShopeeRs = price * shopeeRate;
    const commSellerRs = price * sellerRate;
    const totalCommRs = item.commission ? parseFloat(item.commission) : (price * totalRate);

    return {
      produto: (item.productName || '').substring(0, 30) + '...',
      price: price,
      priceFormatted: 'R$ ' + price.toFixed(2),
      shopeeRatePct: (shopeeRate * 100).toFixed(1) + '%',
      sellerRatePct: (sellerRate * 100).toFixed(1) + '%',
      totalRatePct: (totalRate * 100).toFixed(1) + '%',
      totalCommRs: totalCommRs,
      totalCommRsFormatted: 'R$ ' + totalCommRs.toFixed(2)
    };
  });

  // Ordenar por valor absoluto de comissão (R$) descilente
  processed.sort((a, b) => b.totalCommRs - a.totalCommRs);

  const tableOutput = processed.map(p => ({
    'Produto': p.produto,
    'Preço R$': p.priceFormatted,
    'Taxa Shopee %': p.shopeeRatePct,
    'Taxa Vendedor %': p.sellerRatePct,
    'Taxa Total %': p.totalRatePct,
    'Comissão Absoluta (R$)': p.totalCommRsFormatted
  }));

  console.table(tableOutput);

  // Salvar resultado no output
  const outputDir = path.resolve(process.cwd(), 'src/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outputDir, `commissionComparison_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(processed, null, 2));

  console.log(`\n✅ Comparativo de comissões ordenado por R$ salvo em: ${filePath}\n`);
}

compareCommissions();
