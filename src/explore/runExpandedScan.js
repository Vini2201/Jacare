import fs from 'fs';
import path from 'path';
import { CATEGORIAS_EXPANDIDAS, fetchCategoryProducts } from '../queries/getExpandedCategories.js';

export function classificarEFiltrarProduto(item, configCat) {
  let priceMin = parseFloat(item.priceMin) || 0;
  let priceMax = parseFloat(item.priceMax) || 0;

  // Ajuste fino do preço BRL real
  const priceMinReal = priceMin > 10000 ? priceMin / 100000 : priceMin;
  const priceMaxReal = priceMax > 10000 ? priceMax / 100000 : priceMax;

  const desconto = parseFloat(item.priceDiscountRate) || 0;
  const rating = parseFloat(item.ratingStar) || 0;
  const vendas = parseInt(item.sales || item.historicalSold) || 0;
  const nome = (item.productName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const descontoReal = desconto > 1 ? desconto : desconto * 100;

  // Validações básicas de integridade do produto
  if (priceMinReal <= 0) return null;
  if (!item.offerLink || item.offerLink.trim() === '') return null;
  if (!item.imageUrl || item.imageUrl.trim() === '') return null;
  if (!item.productName || item.productName.trim() === '') return null;
  if (rating < 4.0) return null;

  // Regra de ticket mínimo por categoria
  if (priceMinReal < (configCat.ticketMin || 5)) return null;

  // Regra de vendas mínimas adaptadas por ticket (máquina de lavar precisa de menos vendas que capinha de R$ 5)
  if (vendas < configCat.minVendas) return null;

  // Classificação do produto por faixa de valor para o canal
  let faixaTicket = "🏷️ Baratinho / Achadinho";
  if (priceMinReal >= 1000) {
    faixaTicket = "💎 Alto Ticket / Super Oferta";
  } else if (priceMinReal >= 200) {
    faixaTicket = "⚡ Médio Ticket / Eletro & Tech";
  }

  const priceMinFmt = priceMinReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const priceMaxFmt = priceMaxReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const descontoStr = descontoReal > 0 ? Math.round(descontoReal) + '%' : null;

  const rateFloat = parseFloat(item.commissionRate || '0');
  const comissaoEstimadaRs = (priceMinReal * rateFloat).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const comissaoPct = (rateFloat * 100).toFixed(1) + '%';

  let msg = `${faixaTicket} • ${configCat.nome}\n`;
  msg += `🔥 *${item.productName}*\n\n`;
  msg += `⭐ ${rating.toFixed(1)} | 🛍️ ${vendas}+ vendidos\n\n`;

  if (descontoStr && priceMaxReal > priceMinReal) {
    msg += `💰 ~~${priceMaxFmt}~~ por *${priceMinFmt}*\n`;
    msg += `📉 *${descontoStr} OFF*\n\n`;
  } else {
    msg += `💰 *${priceMinFmt}*\n\n`;
    if (descontoStr) msg += `📉 *${descontoStr} OFF*\n\n`;
  }

  msg += `✨ Comissão Estimada: ${comissaoEstimadaRs} (${comissaoPct})\n`;
  msg += `🛒 Compre aqui 👇\n${item.offerLink}`;

  return {
    ...item,
    priceMinReal,
    priceMaxReal,
    faixaTicket,
    comissaoEstimadaRs,
    comissaoPct,
    mensagemTelegram: msg,
    priceMinFmt,
    priceMaxFmt,
    descontoStr
  };
}

export async function runExpandedScan() {
  console.log('🐊 [Jacaré das Promos] Iniciando Varredura Abrangente (Alto, Médio e Baixo Ticket)...\n');

  const resultadosCompletos = [];

  for (const cat of CATEGORIAS_EXPANDIDAS) {
    console.log(`📌 Buscando categoria: ${cat.nome} (ID: ${cat.id})...`);
    
    // Consulta por ID de categoria + Keywords chave do grupo
    let allNodes = [];
    const res = await fetchCategoryProducts(cat.id);
    if (res && res.data && res.data.productOfferV2 && res.data.productOfferV2.nodes) {
      allNodes = res.data.productOfferV2.nodes;
    }

    // Se houver pouca oferta por ID, faz busca adicional por palavra-chave principal (ex: café, notebook, máquina de lavar)
    if (allNodes.length < 5 && cat.keywords && cat.keywords.length > 0) {
      const kwRes = await fetchCategoryProducts(null, cat.keywords[0]);
      if (kwRes && kwRes.data && kwRes.data.productOfferV2 && kwRes.data.productOfferV2.nodes) {
        allNodes = [...allNodes, ...kwRes.data.productOfferV2.nodes];
      }
    }

    const aprovados = [];
    allNodes.forEach(node => {
      const p = classificarEFiltrarProduto(node, cat);
      if (p && !aprovados.some(a => a.itemId === p.itemId)) {
        aprovados.push(p);
      }
    });

    console.log(`  -> ${aprovados.length} produtos achados no filtro (${cat.nome})\n`);
    resultadosCompletos.push({
      categoria: cat.nome,
      totalAprovados: aprovados.length,
      produtos: aprovados
    });
  }

  const outputDir = path.resolve(process.cwd(), 'src/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outputDir, `n8nScanResults_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(resultadosCompletos, null, 2));

  console.log(`\n✅ Varredura Abrangente Concluída! Relatório salvo em: ${filePath}\n`);
}

runExpandedScan();
