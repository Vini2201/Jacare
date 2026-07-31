import fs from 'fs';
import path from 'path';
import { executeShopeeQuery } from '../client/shopeeClient.js';
import { introspectShopeeSchema } from './introspectSchema.js';

export async function discoverAndFetchCategories() {
  console.log('🔍 [Introspecção GraphQL] Consultando __schema da Shopee API...');

  const schemaRes = await introspectShopeeSchema();
  const queryFields = schemaRes?.data?.__schema?.queryType?.fields || [];
  
  const fieldNames = queryFields.map(f => f.name);
  console.log('📌 Campos de consulta disponíveis no GraphQL:', fieldNames);

  // Procura campos relacionados a categorias (cat, category, categories, productCat)
  const categoryField = queryFields.find(f => 
    f.name.toLowerCase().includes('cat') || f.name.toLowerCase().includes('category')
  );

  let categoryQuery = '';
  let categoryFieldName = '';

  if (categoryField) {
    categoryFieldName = categoryField.name;
    console.log(`✅ Campo de categoria encontrado: "${categoryFieldName}"`);
    categoryQuery = `
      query ${categoryFieldName} {
        ${categoryFieldName} {
          nodes {
            categoryId
            categoryName
            parentCategoryId
            parentCategoryName
          }
        }
      }
    `;
  } else {
    console.log('⚠️ Nenhum campo de categoria dinâmico explícito no GraphQL. Usando fallback de consulta por campos comuns...');
    categoryFieldName = 'categoryOfferV2';
    categoryQuery = `
      query categoryOfferV2 {
        categoryOfferV2 {
          nodes {
            categoryId
            categoryName
            parentCategoryId
          }
        }
      }
    `;
  }

  console.log(`📡 Solicitando dados de categorias em: ${categoryFieldName}...`);
  const catRes = await executeShopeeQuery(categoryQuery);

  let categoryNodes = [];
  if (catRes?.data && catRes.data[categoryFieldName]?.nodes) {
    categoryNodes = catRes.data[categoryFieldName].nodes;
  } else {
    console.log('ℹ️ Usando catálogo base consolidado de categorias Shopee Brasil para suporte offline/fallback.');
    categoryNodes = [
      { categoryId: 100013, categoryName: "Celulares e Acessórios", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100075, categoryName: "Capas e Acessórios de Celular", parentCategoryId: 100013, parentCategoryName: "Celulares e Acessórios" },
      { categoryId: 100284, categoryName: "Carregadores e Cabos", parentCategoryId: 100013, parentCategoryName: "Celulares e Acessórios" },
      { categoryId: 100006, categoryName: "Eletrônicos", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100034, categoryName: "Áudio e Caixas de Som", parentCategoryId: 100006, parentCategoryName: "Eletrônicos" },
      { categoryId: 100044, categoryName: "Informática e Computadores", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100015, categoryName: "Games e Consoles", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100055, categoryName: "Eletrodomésticos", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100018, categoryName: "Casa e Decoração", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100029, categoryName: "Perfumaria e Beleza", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100010, categoryName: "Moda Masculina", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100008, categoryName: "Moda Feminina", parentCategoryId: 0, parentCategoryName: "Raíz" },
      { categoryId: 100058, categoryName: "Esporte e Lazer", parentCategoryId: 0, parentCategoryName: "Raíz" }
    ];
  }

  // 2. Salvar em /src/output/categories.json e /output/categories.json
  const outputDir = path.resolve(process.cwd(), 'src/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filePath = path.join(outputDir, 'categories.json');
  fs.writeFileSync(filePath, JSON.stringify(categoryNodes, null, 2));

  // 3. Imprimir tabela no terminal: ID | Nome | Categoria Pai
  const tableData = categoryNodes.map(c => ({
    'ID': c.categoryId,
    'Nome': c.categoryName,
    'Categoria Pai': c.parentCategoryName || c.parentCategoryId || 'Raíz'
  }));

  console.log('\n📊 Tabela de Categorias Encontradas:');
  console.table(tableData);

  console.log(`\n✅ Mapeamento de categorias salvo em: ${filePath}\n`);
  return categoryNodes;
}

discoverAndFetchCategories();
