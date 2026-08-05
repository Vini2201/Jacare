# Templates Prontos para Deploy Rápidos (1-Click Docker Compose)

Este diretório contém modelos de `docker-compose` pré-configurados para você subir stacks inteiras na sua EC2 em 5 segundos, sem dor de cabeça com instalação de dependências ou configurações de ambiente.

---

## 🚀 Como Usar Qualquer Template na sua EC2

Conecte no terminal da EC2 e rode a pasta desejada:

```bash
cd ~/vps-dashboard/templates/<PASTA-DO-TEMPLATE>
docker compose up -d
```

---

## 🗂️ Templates Incluídos:

### 1. 🛢️ Banco de Dados PostgreSQL + Adminer (GUI Web)
- **Pasta:** `postgres-adminer`
- **Portas:** Postgres (`5432`), Adminer GUI (`8080`)
- **Acesso ao Gerenciador:** `http://SEU_IP:8080`

### 2. 🐬 Banco de Dados MySQL / MariaDB + phpMyAdmin (GUI Web)
- **Pasta:** `mysql-phpmyadmin`
- **Portas:** MySQL (`3306`), phpMyAdmin GUI (`8081`)
- **Acesso ao Gerenciador:** `http://SEU_IP:8081`

### 3. 🐘 PHP + Apache + Nginx
- **Pasta:** `php-web`
- **Portas:** `8000`

### 4. 🐍 Python Django / FastAPI
- **Pasta:** `python-django`
- **Portas:** `8000`

### 5. 🟢 Node.js / Express / Next.js
- **Pasta:** `node-app`
- **Portas:** `3000`

---

## ⚡ Conexão Rápida SSH / MCP
No seu ambiente local (Cursor/Antigravity/VS Code), utilize a chave:
`C:\Users\vsandrade\Documents\GitHub\Jacare\labsuser.pem`

Comando rápido para conectar:
```powershell
ssh -i "C:\Users\vsandrade\Documents\GitHub\Jacare\labsuser.pem" ubuntu@13.222.3.171
```
