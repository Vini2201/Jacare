import fs from 'fs';
import path from 'path';

function buildDashboardHtml() {
  const outputDir = path.resolve(process.cwd(), 'src/output');
  let dataJson = [];

  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith('n8nScanResults_')).sort().reverse();
    if (files.length > 0) {
      const latestFile = path.join(outputDir, files[0]);
      try {
        dataJson = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
      } catch (e) {
        console.error('Erro ao ler JSON:', e.message);
      }
    }
  }

  // Filtrar categorias que possuem produtos
  const categoriasValidas = dataJson.filter(cat => cat.produtos && cat.produtos.length > 0);

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jacaré das Promos - Dashboard por Abas</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0b0f19;
      --card-bg: rgba(22, 30, 49, 0.7);
      --card-border: rgba(45, 212, 191, 0.15);
      --primary-green: #10b981;
      --accent-cyan: #06b6d4;
      --text-main: #f3f4f6;
      --text-muted: #9ca3af;
      --badge-discount: #ef4444;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Outfit', sans-serif;
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.12) 0%, transparent 40%);
      color: var(--text-main);
      min-height: 100vh;
      padding: 2rem;
    }

    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 1400px;
      margin: 0 auto 2rem auto;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .brand-icon {
      font-size: 2.5rem;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand h1 {
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #ffffff 30%, #a7f3d0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .brand p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* SISTEMA DE ABAS (TABS) */
    .tabs-wrapper {
      max-width: 1400px;
      margin: 0 auto 2rem auto;
      display: flex;
      gap: 0.8rem;
      overflow-x: auto;
      padding-bottom: 0.8rem;
      scrollbar-width: thin;
    }

    .tab-btn {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-muted);
      padding: 0.75rem 1.4rem;
      border-radius: 12px;
      font-family: inherit;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .tab-btn:hover {
      background: rgba(16, 185, 129, 0.15);
      color: #fff;
      border-color: rgba(16, 185, 129, 0.3);
    }

    .tab-btn.active {
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #fff;
      border-color: transparent;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
    }

    .tab-count {
      background: rgba(0, 0, 0, 0.25);
      padding: 0.15rem 0.5rem;
      border-radius: 99px;
      font-size: 0.8rem;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    .tab-content {
      display: none;
      animation: fadeIn 0.4s ease forwards;
    }

    .tab-content.active {
      display: block;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s ease;
    }

    .card:hover {
      transform: translateY(-6px);
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
    }

    .img-wrapper {
      width: 100%;
      height: 200px;
      position: relative;
      background: rgba(0, 0, 0, 0.2);
      overflow: hidden;
    }

    .img-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .discount-badge {
      position: absolute;
      top: 12px;
      right: 12px;
      background: var(--badge-discount);
      color: #fff;
      font-weight: 900;
      font-size: 0.8rem;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
    }

    .commission-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      padding: 0.3rem 0.6rem;
      border-radius: 8px;
    }

    .card-content {
      padding: 1.2rem;
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .shop-name {
      font-size: 0.75rem;
      text-transform: uppercase;
      color: var(--accent-cyan);
      margin-bottom: 0.4rem;
      font-weight: 600;
    }

    .product-title {
      font-size: 1rem;
      font-weight: 600;
      margin-bottom: 0.8rem;
      color: #f9fafb;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .metrics {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-bottom: 1rem;
    }

    .price-box {
      margin-top: auto;
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .price-old {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-decoration: line-through;
    }

    .price-current {
      font-size: 1.4rem;
      font-weight: 900;
      color: #10b981;
    }

    .btn-buy {
      display: inline-block;
      width: 100%;
      text-align: center;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      color: #fff;
      font-weight: 700;
      padding: 0.75rem;
      border-radius: 10px;
      text-decoration: none;
      margin-top: 1rem;
    }

    .preview-telegram {
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 0.8rem;
      margin-top: 1rem;
      font-size: 0.75rem;
      font-family: monospace;
      white-space: pre-wrap;
      color: #cbd5e1;
      border-left: 3px solid var(--accent-cyan);
    }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-icon">🐊</div>
      <div>
        <h1>Jacaré das Promos</h1>
        <p>Curadoria por Categorias (Máximo de 10 itens por aba)</p>
      </div>
    </div>
  </header>

  <!-- ABAS DAS CATEGORIAS -->
  <div class="tabs-wrapper">
    ${categoriasValidas.map((cat, idx) => `
      <button class="tab-btn ${idx === 0 ? 'active' : ''}" onclick="switchTab(${idx})">
        <span>${cat.categoria}</span>
        <span class="tab-count">${Math.min(cat.produtos.length, 10)}</span>
      </button>
    `).join('')}
  </div>

  <div class="container">
    ${categoriasValidas.map((cat, idx) => {
      // Limita a no máximo 10 produtos por categoria
      const produtosLimitados = cat.produtos.slice(0, 10);

      return `
        <div id="tab-content-${idx}" class="tab-content ${idx === 0 ? 'active' : ''}">
          <div class="grid">
            ${produtosLimitados.map(p => {
              const priceMin = parseFloat(p.priceMin) || 0;
              const priceMax = parseFloat(p.priceMax) || 0;
              const priceReal = priceMin > 10000 ? priceMin / 100000 : priceMin;
              const priceOldReal = priceMax > 10000 ? priceMax / 100000 : priceMax;
              const commPct = ((parseFloat(p.commissionRate || 0)) * 100).toFixed(1) + '%';
              const commRs = (priceReal * parseFloat(p.commissionRate || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

              return `
                <div class="card">
                  <div class="img-wrapper">
                    <img src="${p.imageUrl}" alt="${p.productName}" loading="lazy">
                    ${p.priceDiscountRate ? `<div class="discount-badge">-${p.priceDiscountRate}%</div>` : ''}
                    <div class="commission-badge">+${commPct} (${commRs})</div>
                  </div>
                  <div class="card-content">
                    <div class="shop-name">🏪 ${p.shopName || 'Shopee Partner'}</div>
                    <h3 class="product-title" title="${p.productName}">${p.productName}</h3>
                    <div class="metrics">
                      <div>⭐ ${p.ratingStar || '4.5'}</div>
                      <div>🛍️ ${p.sales || 0}+ vendas</div>
                    </div>
                    <div class="price-box">
                      <div>
                        ${priceOldReal > priceReal ? `<div class="price-old">R$ ${priceOldReal.toFixed(2)}</div>` : ''}
                        <div class="price-current">R$ ${priceReal.toFixed(2)}</div>
                      </div>
                    </div>
                    <a href="${p.offerLink}" target="_blank" class="btn-buy">Testar Link de Afiliado 🚀</a>
                    <div class="preview-telegram"><strong>Preview Telegram:</strong>\n${p.mensagemTelegram || ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('')}
  </div>

  <script>
    function switchTab(index) {
      document.querySelectorAll('.tab-btn').forEach((btn, idx) => {
        if (idx === index) btn.classList.add('active');
        else btn.classList.remove('active');
      });

      document.querySelectorAll('.tab-content').forEach((content, idx) => {
        if (idx === index) content.classList.add('active');
        else content.classList.remove('active');
      });
    }
  </script>

</body>
</html>`;

  const dashboardPath = path.resolve(process.cwd(), 'dashboard.html');
  fs.writeFileSync(dashboardPath, htmlContent);
  console.log(`✅ Dashboard com Abas e Limite de 10 Itens gerado com sucesso em: ${dashboardPath}`);
}

buildDashboardHtml();
