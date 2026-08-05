# Configurações de Conexão Rápida & MCP SSH - Jacaré EC2

## 🔑 Credenciais de Acesso Rápido
- **Host / IP Atual:** `13.222.3.171`
- **Usuário SSH:** `ubuntu`
- **Caminho da Chave PEM:** `C:\Users\vsandrade\Documents\GitHub\Jacare\labsuser.pem`
- **Nome da Instância:** `ViniLab` (`i-0612959610bc61ea8`)

---

## ⚡ Atalho Rápido para Terminal (PowerShell / Git Bash)
```powershell
ssh -i "C:\Users\vsandrade\Documents\GitHub\Jacare\labsuser.pem" ubuntu@13.222.3.171
```

---

## 🌐 Módulos Prontos para Deploy em 1 Clique (`/templates`)

| Módulo | Descrição | Gerenciador Web GUI | Porta Web |
| :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | Banco de dados Relacional | Adminer Web | `8080` |
| **MySQL 8.0** | Banco de dados Relacional | phpMyAdmin Web | `8081` |
| **PHP Web** | Suporte a PHP 8.x / WordPress / Laravel | Apache / Nginx | `8000` |
| **Python** | Django / FastAPI / Flask | Uvicorn / Gunicorn | `8000` |
| **Node.js** | Express / NestJS / Next.js | PM2 / Node Engine | `3000` |

---

## 🛠️ Como subir o Dashboard da VPS na EC2

Na EC2, clone seu repositório ou envie a pasta `vps-dashboard` e execute:

```bash
cd vps-dashboard
docker compose up -d --build
```
Acesse o painel em: `http://13.222.3.171:3000`
