import fs from 'fs';
import path from 'path';
import { fetchProductOfferV2 } from '../queries/productOfferV2.js';

// Função para resolver o filtro por nome de categoria dinâmico
export function resolveCategory(searchTerm) {
  if (!searchTerm) return null;

  const categoriesPath = path.resolve(process.cwd(), 'src/output/categories.json');
  let categories = [];

  if (fs.existsSync(categoriesPath)) {
    try {
      categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
    } catch (e) {
      console.warn('⚠️ Erro ao ler categories.json:', e.message);
    }
  }

  const termNorm = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Busca exata ou por palavra-chave no nome da categoria
  const match = categories.find(c => {
    const catNameNorm = c.categoryName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return catNameNorm.includes(termNorm) || termNorm.includes(catNameNorm);
  });

  if (match) {
    console.log(`🎯 Categoria resolvida por busca "${searchTerm}": ${match.categoryName} (ID: ${match.categoryId})`);
    return match;
  }

  console.log(`ℹ️ Categoria "${searchTerm}" não encontrada diretamente em categories.json. Usando como filtro por palavra-chave (keyword)...`);
  return { categoryId: null, categoryName: searchTerm, keyword: searchTerm };
}

export function filtrarEFormatarProduto(item, catNome = '') {
  let priceMin = parseFloat(item.priceMin) || 0;
  let priceMax = parseFloat(item.priceMax) || 0;

  const priceMinReal = priceMin > 10000 ? priceMin / 100000 : priceMin;
  const priceMaxReal = priceMax > 10000 ? priceMax / 100000 : priceMax;

  const desconto = parseFloat(item.priceDiscountRate) || 0;
  const rating = parseFloat(item.ratingStar) || 0;
  const vendas = parseInt(item.sales || item.historicalSold) || 0;
  const nome = (item.productName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const descontoReal = desconto > 1 ? desconto : desconto * 100;

  if (priceMinReal <= 0) return null;
  if (!item.offerLink || item.offerLink.trim() === '') return null;
  if (!item.imageUrl || item.imageUrl.trim() === '') return null;
  if (!item.productName || item.productName.trim() === '') return null;
  if (rating < 4.0) return null;

  const priceMinFmt = priceMinReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const priceMaxFmt = priceMaxReal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const descontoStr = descontoReal > 0 ? Math.round(descontoReal) + '%' : null;

  const rateFloat = parseFloat(item.commissionRate || '0');
  const comissaoEstimadaRs = (priceMinReal * rateFloat).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  let msg = '';
  if (catNome) msg += `${catNome}\n`;
  msg += `🔥 *${item.productName}*\n\n`;
  msg += `⭐ ${rating.toFixed(1)} | 🛍️ ${vendas}+ vendidos\n\n`;

  if (descontoStr && priceMaxReal > priceMinReal) {
    msg += `💰 ~~${priceMaxFmt}~~ por *${priceMinFmt}*\n`;
    msg += `📉 *${descontoStr} OFF*\n\n`;
  } else {
    msg += `💰 *${priceMinFmt}*\n\n`;
    if (descontoStr) msg += `📉 *${descontoStr} OFF*\n\n`;
  }

  msg += `🛒 Compre aqui 👇\n${item.offerLink}`;

  return {
    ...item,
    priceMinReal,
    priceMaxReal,
    comissaoEstimadaRs,
    mensagemTelegram: msg,
    priceMinFmt,
    priceMaxFmt,
    descontoStr
  };
}

export async function runProductScan(filterCategoryName = null) {
  console.log('🔍 [Jacaré das Promos] Executando scan de produtos na Shopee...\n');

  let targetCategories = [];

  if (filterCategoryName) {
    const resolved = resolveCategory(filterCategoryName);
    targetCategories = [{ id: resolved.categoryId, nome: resolved.categoryName, keyword: resolved.keyword }];
  } else {
    const categoriesPath = path.resolve(process.cwd(), 'src/output/categories.json');
    if (fs.existsSync(categoriesPath)) {
      const allCats = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      targetCategories = allCats.map(c => ({ id: c.categoryId, nome: c.categoryName }));
    }
  }

  const resultados = [];

  for (const cat of targetCategories) {
    console.log(`📌 Varrendo: ${cat.nome} ${cat.id ? `(ID: ${cat.id})` : '(Palavra-chave)'}...`);
    const res = await fetchProductOfferV2({
      productCatId: cat.id || null,
      keyword: cat.keyword || null,
      listType: 1,
      sortType: 2,
      limit: 10
    });

    const nodes = res && res.data && res.data.productOfferV2 && res.data.productOfferV2.nodes ? res.data.productOfferV2.nodes : [];

    const aprovados = [];
    nodes.forEach(node => {
      const p = filtrarEFormatarProduto(node, cat.nome);
      if (p) aprovados.push(p);
    });

    console.log(`  -> ${aprovados.length} produtos aprovados na qualidade.`);
    resultados.push({ categoria: cat.nome, totalAprovados: aprovados.length, produtos: aprovados });
  }

  const outputDir = path.resolve(process.cwd(), 'src/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(outputDir, `n8nScanResults_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(resultados, null, 2));

  console.log(`\n✅ Scan concluído e salvo em: ${filePath}\n`);
}

// Suporte para filtro via linha de comando CLI (ex: node runProductScan.js notebook)
const categoryArg = process.argv[2] || null;
runProductScan(categoryArg);
