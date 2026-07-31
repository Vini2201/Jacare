import fs from 'fs';
import path from 'path';
import { MATRIZ_NICHOS, executeMultiCategoryQuery } from '../queries/getMultiCategoryFeed.js';

export function classificarEFiltrarNicho(item, nicho) {
  let priceMin = parseFloat(item.priceMin) || 0;
  let priceMax = parseFloat(item.priceMax) || 0;

  const priceMinReal = priceMin > 10000 ? priceMin / 100000 : priceMin;
  const priceMaxReal = priceMax > 10000 ? priceMax / 100000 : priceMax;

  const desconto = parseFloat(item.priceDiscountRate) || 0;
  const rating = parseFloat(item.ratingStar) || 0;
  const vendas = parseInt(item.sales || item.historicalSold) || 0;

  const descontoReal = desconto > 1 ? desconto : desconto * 100;

  if (priceMinReal <= 0) return null;
  if (!item.offerLink || item.offerLink.trim() === '') return null;
  if (!item.imageUrl || item.imageUrl.trim() === '') return null;
  if (!item.productName || item.productName.trim() === '') return null;

  let etiquetaTicket = "🏷️ Achadinho";
  if (priceMinReal >= 800) {
    etiquetaTicket = "💎 Alto Ticket / Super Desconto";
  } else if (priceMinReal >= 150) {
    etiquetaTicket = "⚡ Médio Ticket / Destaque";
  }

  const priceMinFmt = priceMinReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const priceMaxFmt = priceMaxReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const descontoStr = descontoReal > 0 ? Math.round(descontoReal) + '%' : null;

  const rateFloat = parseFloat(item.commissionRate || '0');
  const comissaoEstimadaRs = (priceMinReal * rateFloat).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const comissaoPct = (rateFloat * 100).toFixed(1) + '%';

  let msg = `${etiquetaTicket} • ${nicho.nome}\n`;
  msg += `🔥 *${item.productName}*\n\n`;
  msg += `⭐ ${rating ? rating.toFixed(1) : '4.5'} | 🛍️ ${vendas}+ vendidos\n\n`;

  if (descontoStr && priceMaxReal > priceMinReal) {
    msg += `💰 ~~${priceMaxFmt}~~ por *${priceMinFmt}*\n`;
    msg += `📉 *${descontoStr} OFF*\n\n`;
  } else {
    msg += `💰 *${priceMinFmt}*\n\n`;
    if (descontoStr) msg += `📉 *${descontoStr} OFF*\n\n`;
  }

  msg += `💸 Comissão Estimada: ${comissaoEstimadaRs} (${comissaoPct})\n`;
  msg += `🛒 Compre aqui 👇\n${item.offerLink}`;

  return {
    ...item,
    priceMinReal,
    priceMaxReal,
    etiquetaTicket,
    comissaoEstimadaRs,
    comissaoPct,
    mensagemTelegram: msg,
    priceMinFmt,
    priceMaxFmt,
    descontoStr
  };
}

export async function runMultiCategoryScan() {
  console.log('🚀 [Jacaré das Promos] Rodando Varredura Multi-Categorias Ampla...\n');

  const relatorioFinal = [];

  for (const nicho of MATRIZ_NICHOS) {
    console.log(`📡 Consultando Nicho: ${nicho.nome}...`);
    const nodes = await executeMultiCategoryQuery(nicho);

    const aprovados = [];
    nodes.forEach(item => {
      const p = classificarEFiltrarNicho(item, nicho);
      if (p) aprovados.push(p);
    });

    console.log(`  -> ${aprovados.length} achadinhos aprovados neste nicho.\n`);
    relatorioFinal.push({
      categoria: nicho.nome,
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
  fs.writeFileSync(filePath, JSON.stringify(relatorioFinal, null, 2));

  console.log(`\n✅ Varredura Multi-Categorias Ampla Concluída! Relatório salvo em: ${filePath}\n`);
}

runMultiCategoryScan();
