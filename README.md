# 🐊 Jacaré Engine & VPS Manager + Prezzy SaaS

Painel ultraleve e inteligente para gerenciamento de instâncias AWS EC2 / VPS Linux, deploys automatizados em Docker, automação Telegram, SSH via Web e o SaaS **Prezzy** (Gerador de Apresentações com IA).

---

## 🌐 Como Acessar o Prezzy e os Serviços na VPS

A sua VPS está hospedada no IP **`13.222.3.171`**.

### 1. 🎨 Acesso ao Prezzy SaaS
O **Prezzy** (SaaS de geração de apresentações e eBooks com IA) pode ser acessado na VPS dependendo da porta e ambiente:
- **Painel Web / Frontend (Next.js):** `http://13.222.3.171:3000` (ou na porta configurada via container `apps/prezzy`)
- **API Backend (FastAPI / Swagger):** `http://13.222.3.171:8000/docs`
- **Subir/Iniciar o Prezzy na VPS:**
  ```bash
  cd /app/apps/prezzy # ou ~/Jacare/apps/prezzy
  docker compose up -d --build
  ```

---

## 🚀 Acesso à VPS e Painel Principal (Jacaré Engine)

- **URL do Painel Jacaré Engine:** `http://13.222.3.171` (Porta 80)
  - **Login:** `bsbvinidesousa@gmail.com`
  - **Senha:** `Cap@2026`
- **Acesso SSH via Terminal Local:**
  ```bash
  ssh -i "labsuser.pem" ubuntu@13.222.3.171
  ```

---

## 🟢 Status Atual dos Containers na VPS

Os seguintes serviços estão rodando atualmente na VPS (`13.222.3.171`):

| Container | Imagem | Porta Exposta (Host) | Descrição / Acesso |
| :--- | :--- | :--- | :--- |
| **`vps-dashboard`** | `jacare-vps-dashboard` | **`:80`** (`http://13.222.3.171`) | Painel Jacaré Engine + Agent |
| **`telegram_mtproto_service`** | `telegram-service` | **`:4000`** | Microserviço GramJS Telegram |
| **`postgres-db-1786023803573`** | `postgres:16-alpine` | **`:5432`** | Banco de Dados PostgreSQL |
| **`redis-cache-1786023840505`** | `redis:alpine` | **`:6379`** | Fila e Cache Redis |
| **`nginx-web-1785942956086`** | `nginx:alpine` | **`:8080`** (`http://13.222.3.171:8080`) | Nginx Web Proxy |

---


## 📱 Guia Completo do Painel: O que tem em cada aba

Ao acessar o Jacaré Engine no navegador (`http://13.222.3.171`), você encontra 5 abas principais na interface:

### 🤖 1. Jacaré AI Agent (Hermes Style)
- **O que faz:** Um assistente agêntico autônomo com inteligência artificial via Groq/OpenAI.
- **Funcionalidades:**
  - Permite controlar a VPS usando linguagem natural (ex: *"Sobe um banco PostgreSQL na porta 5433"* ou *"Verifique a memória livre"*).
  - Executa ações diretas no Docker (subir, parar, listar containers) e comandos bash.
  - Possui modal de **⚙️ Configurar IA** para trocar o provedor (Groq, OpenAI, OpenRouter, Ollama) e chaves de API.

### 📦 2. Serviços & Containers (Easypanel Style)
- **O que faz:** Gerenciador visual de containers Docker rodando na VPS.
- **Funcionalidades:**
  - Card visual para cada serviço exibindo status (Running/Stopped), consumo de CPU em % e RAM em MB.
  - **Botões de Ação:** Iniciar, Parar, Reiniciar, Ver Logs em tempo real e Deletar.
  - **Rebind de Portas:** Permite alterar as portas expostas sem precisar usar comandos no terminal.
  - **Botão + Novo Serviço:** Abre o modal de deploy rápido com presets prontos (PostgreSQL 16, MySQL 8.0, Nginx, Redis, **Prezzy SaaS Suite** ou imagem customizada do Docker Hub).

### 📊 3. Telemetria VPS
- **O que faz:** Dashboard de monitoramento de hardware em tempo real via WebSockets.
- **Funcionalidades:**
  - **Uso de CPU:** Porcentagem atual de uso e quantidade de núcleos (Cores).
  - **Memória RAM:** Utilização exata (ex: `1.2 GB / 4.0 GB`) e barra de progresso.
  - **Armazenamento em Disco:** Espaço ocupado e livre nas partições.
  - Header fixo com **Uptime do Sistema** e **IP Público**.

### ✉️ 4. Telegram MTProto
- **O que faz:** Central de disparos e automação via Telegram.
- **Funcionalidades:**
  - Integração com o microserviço GramJS/TelegramClient da VPS.
  - Permite enviar mensagens instantâneas digitando o ID, username (`@canal_promos`) ou link do grupo/canal.

### 💻 5. Terminal SSH
- **O que faz:** Console Bash interativo direto no navegador.
- **Funcionalidades:**
  - Permite executar qualquer comando Linux Ubuntu diretamente no ambiente da VPS sem precisar abrir o aplicativo de SSH/PuTTY.
  - Exibe retornos de comandos em tempo real (`docker ps`, `ls -la`, `git status`, etc.).

---

## 🗂️ Módulos e Templates Prontos (`/templates` e `/apps`)

| Módulo / App | Como Subir na VPS | Porta / Acesso |
| :--- | :--- | :--- |
| **Prezzy SaaS Suite** | `cd apps/prezzy && docker compose up -d` | `:8000` (API) / `:3000` (App) |
| **PostgreSQL 16 + Adminer** | `cd templates/postgres-adminer && docker compose up -d` | `:8080` (Adminer GUI) |
| **MySQL 8.0 + phpMyAdmin** | `cd templates/mysql-phpmyadmin && docker compose up -d` | `:8081` (phpMyAdmin) |

