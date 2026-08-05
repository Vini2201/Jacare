# 🐊 Jacaré VPS Manager & Multi-Stack Deployer

Um painel ultraleve de gerenciamento para instâncias AWS EC2 / VPS Linux e sistema de implantação rápida de containers Docker.

---

## 🚀 Como Subir na sua EC2 / VPS

### 1. Clonar e Iniciar o Dashboard (1 Comando)

No terminal da sua EC2 (Ubuntu), execute:

```bash
git clone https://github.com/SEU_USUARIO/Jacare.git
cd Jacare
docker compose up -d --build
```

O dashboard estará disponível em `http://SEU_IP:3000`.

---

## 📊 Recursos do VPS Dashboard
- **Monitoramento em Tempo Real:** Uso de CPU, Memória RAM, SWAP e Espaço em Disco (via WebSockets).
- **Gerenciador Docker:** Lista todos os containers rodando com botões de **Iniciar**, **Parar** e visualizador de **Logs** em tempo real.
- **Leveza Extrema:** Consome menos de **20MB de RAM**!

---

## 🗂️ Módulos / Templates Prontos (`/templates`)

Suba bancos de dados e ambientes de desenvolvimento em segundos:

| Módulo | Comando para Subir | Porta Web / GUI |
| :--- | :--- | :--- |
| **PostgreSQL 16 + Adminer** | `cd templates/postgres-adminer && docker compose up -d` | `8080` (Adminer GUI) |
| **MySQL 8.0 + phpMyAdmin** | `cd templates/mysql-phpmyadmin && docker compose up -d` | `8081` (phpMyAdmin) |

---

## 🔑 Acesso SSH / MCP Rápido
- **Host / IP:** `13.222.3.171`
- **Usuário:** `ubuntu`
- **Chave SSH:** `labsuser.pem`
