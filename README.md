# Jacare das Promos - Script Exploratório Shopee Affiliate API

Este repositório contém a estrutura exploratória (CLI) para testar os endpoints, filtros, sortTypes e geração de comissões da **Shopee Affiliate Open API (GraphQL)** para o projeto **Jacaré das Promos**.

## 🚀 Como Executar

### 1. Requisitos
Você pode usar o **Node.js Portátil** instalado em seu sistema:
`C:\Users\vsandrade\Documents\OpenSquad-Carrossel\.portable\node\node.exe`

### 2. Configurar Variáveis de Ambiente
As credenciais estão salvas no arquivo `.env`:
- `SHOPEE_APP_ID=18353060752`
- `SHOPEE_SECRET_KEY=ROQWHFAOZJI4SV6M5HNVJQAXRL4QIA5W`

---

## 📂 Novas Funcionalidades de Categorias

### 1. Mapeamento da Árvore de Categorias (`getCategories.js`)
Executa a **introspecção de schema GraphQL**, descobre as categorias disponíveis na Shopee, imprime a tabela formatada no terminal e salva a árvore em `/src/output/categories.json`:

```bash
& "C:\Users\vsandrade\Documents\OpenSquad-Carrossel\.portable\node\node.exe" src/queries/getCategories.js
```

### 2. Filtro por Nome da Categoria no Scan (`runProductScan.js`)
Agora você pode filtrar por **nome da categoria** (ex: `eletrodomésticos`, `celulares`, `áudio`, `games`, `café`) direto na linha de comando. O script resolve automaticamente o nome do texto para o ID da categoria correspondente salvo em `categories.json` ou busca por palavra-chave se não houver ID direto.

```bash
# Exemplo 1: Filtrar por Eletrodomésticos
& "C:\Users\vsandrade\Documents\OpenSquad-Carrossel\.portable\node\node.exe" src/explore/runProductScan.js eletrodomésticos

# Exemplo 2: Filtrar por Celulares
& "C:\Users\vsandrade\Documents\OpenSquad-Carrossel\.portable\node\node.exe" src/explore/runProductScan.js celulares

# Exemplo 3: Atualizar o Dashboard HTML
& "C:\Users\vsandrade\Documents\OpenSquad-Carrossel\.portable\node\node.exe" src/explore/buildDashboard.js
```

---

## 📂 Estrutura de Arquivos

- `/src/queries/introspectSchema.js`: Realiza a consulta `__schema` de introspecção no GraphQL.
- `/src/queries/getCategories.js`: Mapeia a árvore de categorias, salva em `categories.json` e imprime a tabela CLI.
- `/src/explore/runProductScan.js`: Lê `categories.json` e aceita filtros textuais de categoria na linha de comando.
- `/src/output/categories.json`: Mapeamento estruturado das categorias da Shopee.
- `/dashboard.html`: Interface visual local para preview dos achadinhos e da copy do Telegram.
