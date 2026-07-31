# Plano de Arquitetura: Serviço Telegram MTProto (GramJS + Node.js) em Docker EC2

> **Data de Criação:** 31/07/2026  
> **Status:** EC2 Ubuntu + Docker/Docker Compose 100% Instalados  
> **Servidor EC2:** `ViniLab` (`54.221.29.149` / Ubuntu 26.04) — AWS Academy / Vocareum  
> **Chave SSH:** `C:\Users\vsandrade\Documents\GitHub\Jacare\labsuser.pem` (Usuário: `ubuntu`)

---

## 1. Visão Geral do Sistema

Criar um microserviço Node.js/TypeScript leve usando **GramJS** (`telegram` no npm) para automação de contas reais de usuário no Telegram via protocolo MTProto. O serviço será empacotado em **Docker Container** de baixíssimo consumo e gerenciado via **Docker Compose** na instância EC2 AWS.

### Principais Objetivos:
1. **Autenticação Visual/API:** Interface web leve para inserir número de telefone e o código OTP (SMS) recebido no Telegram.
2. **Integração com n8n:** Endpoints REST / Webhooks para que o n8n consiga disparar envio de mensagens, leitura de grupos/canais e scraping.
3. **Persistência de Sessão:** Salvar a `StringSession` (chave da sessão Telegram) em banco ou volume persistente para não deslogar quando o container reiniciar.
4. **Arquitetura Enxuta:** Rodar com Docker Compose puro (sem gastar RAM com painéis pesados tipo Easypanel/Coolify).

---

## 2. Estado Atual do Ambiente (Checklist de Progresso)

- [x] Instância AWS EC2 `t3.micro` iniciada com 30GB EBS (Ubuntu 26.04)
- [x] Grupo de Segurança configurado (Porta 22 SSH, 80 HTTP, 443 HTTPS liberados)
- [x] Docker Engine & Docker Compose V2 instalados com sucesso
- [x] Permissão do usuário `ubuntu` adicionada ao grupo `docker`
- [ ] Criar repositório/pasta do Microserviço no `Jacare` (Node.js + GramJS + Express)
- [ ] Criar `Dockerfile` e `docker-compose.yml`
- [ ] Criar Interface Web de Login no Telegram (Autenticação MTProto)
- [ ] Expor endpoints REST para o n8n (ex: `/api/send-message`, `/api/groups`, `/api/listen`)
- [ ] Configurar Nginx / Traefik com SSL automático (Let's Encrypt / Certbot)

---

## 3. Estrutura Proposta do Código (`/telegram-service`)

```text
Jacare/
├── telegram-service/
│   ├── src/
│   │   ├── config/          # API_ID e API_HASH da Telegram (my.telegram.org)
│   │   ├── telegram/        # Cliente GramJS, gerenciador de sessão MTProto
│   │   ├── routes/          # Rotas da API REST (Webhooks pro n8n)
│   │   ├── public/          # Interface Web moderna (HTML/JS/CSS) para Login SMS
│   │   └── server.js        # Servidor Express/Fastify
│   ├── session/             # Volume persistente para StringSession
│   ├── Dockerfile
│   └── docker-compose.yml
└── TELEGRAM_SERVICE_PLAN.md # Este documento de memória persistente
```

---

## 4. Próximos Passos (Para executar ao voltar pra casa)

1. **Gerar Credenciais Telegram:**
   - Acessar [my.telegram.org](https://my.telegram.org), criar uma aplicação e obter o `api_id` e `api_hash`.

2. **Conectar na EC2 (Caso o IP troque se a máquina reiniciar):**
   - Conectar via **EC2 Instance Connect** no console da AWS com o usuário `ubuntu`.

3. **Subir o Container na EC2:**
   ```bash
   cd ~/telegram-service
   docker compose up -d --build
   ```

4. **Conectar com n8n:**
   - Chamar os endpoints HTTP criados no container Node.js para orquestrar as automações do "Jacaré das Promos".

---

> 📌 *Este arquivo foi salvo no repositório para garantir a continuidade em qualquer sessão com a IA.*
