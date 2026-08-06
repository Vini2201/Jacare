<div align="center">
  <img src="https://via.placeholder.com/150x150/0f172a/9333ea?text=P" alt="Prezzy Logo" width="100"/>
  <h1>PREZZY</h1>
  <p><strong>A Plataforma Definitiva de Geração de Apresentações e eBooks com Inteligência Artificial.</strong></p>
</div>

---

## 🚀 Sobre o Projeto

O **PREZZY** é um SaaS moderno projetado para automatizar e escalar a criação de conteúdo visual. Em vez de simplesmente gerar slides genéricos, o PREZZY atua como uma agência de conteúdo interna. Ele recebe um briefing (podendo ingerir PDFs, planilhas e DOCX pesados), processa as informações em uma arquitetura de múltiplos agentes, escreve a narrativa baseada no **Gabarito V4**, e injeta o conteúdo em um Template Engine nativo com as cores da sua marca, exportando tudo via motor invisível em PDF de alta resolução.

## 🌟 Diferenciais (Features)

> 📘 **Leia o [Manual Técnico e Operacional](PREZZY_MANUAL.md)** para entender a fundo o fluxo, a arquitetura e como operar este SaaS.

- **RAG & pgvector:** Ingestão de arquivos pesados cortados em *chunks* e salvos no Supabase. O agente consulta vetorialmente para não estourar os limites de tokens da IA.
- **Multi-Agent Pipeline:** Os projetos não são criados num prompt único. Uma fila assíncrona (Redis) orquestra o *Researcher*, *Architect*, *Copywriter*, *Designer* e *Reviewer*.
- **Motor Multi-IA:** O Admin pode rotear a geração usando a API da **Nvidia**, **Groq**, **OpenAI** ou **OpenRouter**, além de suportar os Embeddings do **Gemini**.
- **Human-in-the-Loop:** A IA gera um rascunho (*Draft*) estruturado que aguarda a aprovação visual do usuário no Dashboard antes de gastar recursos de processamento final.
- **Brand Kits:** Cada usuário configura logo, fonte e paleta de cores. O Template Engine (usando *Vanilla CSS*) se adapta instantaneamente.
- **Render Engine Impecável:** Utiliza *Playwright* no backend para tirar screenshots e exportar o HTML para PDF em resoluções *Custom* (ex: 1920x1080).
- **Sistema de Créditos:** Banco de dados otimizado para SaaS; novos usuários recebem 50 créditos automaticamente para testarem as gerações.
- **Monitoramento de Superuser:** Qualquer falha na fila de agentes dispara alertas automáticos em formato rico direto pro seu **Telegram** e **Gmail**.

---

## 🏗️ Arquitetura (Monorepo)

```text
prezzy/
├── frontend/             # 💻 Next.js 15 (App Router, TailwindCSS, Shadcn)
│   ├── src/app/          # Landing Page, Dashboard, Wizard
│
├── backend/              # ⚙️ FastAPI (Python)
│   ├── app/
│   │   ├── core/         # Pydantic Settings
│   │   ├── models/       # Pydantic Domain Models
│   │   ├── agents/       # Orchestrator & Master Agent
│   │   ├── providers/    # Interface Abstrata para Llama, GPT, etc
│   │   ├── templates/    # HTML e injeção de CSS Dinâmico
│   │   └── services/     # RAG, Parser, Playwright, Alertas
│   ├── worker.py         # Entrypoint da Fila do Redis (Arq)
│   └── requirements.txt
│
├── supabase_schema.sql   # 🗄️ Tabelas, RLS e pgvector do BD
└── render.yaml           # 🚀 Blueprint nativo de deploy no Render.com
```

---

## 🛠️ Stack Tecnológica

### Frontend
* **Next.js 15** (Framework React)
* **Tailwind CSS** (Estilização Utilitária)
* **Supabase Auth** (Gerenciamento de Autenticação)

### Backend
* **FastAPI** (APIs rápidas e assíncronas)
* **Arq + Redis** (Fila de trabalhos pesados)
* **Playwright** (Motor de conversão de HTML para PDF)
* **Instructor / OpenAI** (Parsers de JSON rígido para IA)
* **PyMuPDF / pandas** (Leitura de documentos)

### Banco de Dados (Supabase)
* **PostgreSQL** com **pgvector**

---

## ⚙️ Instalação e Uso Local

### 1. Configurando o Banco de Dados
1. Crie um projeto no [Supabase](https://supabase.com).
2. Vá até a aba **SQL Editor**.
3. Copie todo o conteúdo do arquivo `supabase_schema.sql` (presente na raiz deste repositório) e execute-o. Ele habilitará o *pgvector*, criará todas as tabelas, definirá as regras de segurança e criará a trigger de créditos iniciais.

### 2. Configurando o Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```
Crie um arquivo `.env` dentro da pasta `backend` baseado no `.env.example`:
```env
SUPABASE_URL=...
SUPABASE_SERVICE_KEY=...
NVIDIA_API_KEY=...
GEMINI_API_KEY=...
REDIS_URL=redis://localhost:6379
# Configure o restante (Telegram, Email, etc)...
```
Rode a API e o Worker:
```bash
# Terminal 1
uvicorn app.main:app --reload

# Terminal 2 (Fila)
arq worker.WorkerSettings
```

### 3. Configurando o Frontend
```bash
cd frontend
npm install
npm run dev
```
Abra o navegador em `http://localhost:3000`.

---

## ☁️ Deploy no Render.com (1 Clique)

O repositório já está configurado para automação total de infraestrutura através do Blueprint (agora no Tier Free sem exigir cartão).

1. Faça o *Push* deste código para o seu GitHub.
2. Acesse sua Dashboard no [Render.com](https://render.com) e clique em **"New > Blueprint"**.
3. Selecione este repositório.
4. O Render detectará automaticamente o arquivo `render.yaml` e criará:
   * **Um Web Service Python (Free)** instalando as libs e o Playwright (Backend).
   * **Um Web Service Node (Free)** executando a build do Next.js (Frontend).
5. Preencha os valores das chaves de API secretas que o painel solicitar e pronto!

---
> Desenvolvido com 💜 por Vini Andrade.
