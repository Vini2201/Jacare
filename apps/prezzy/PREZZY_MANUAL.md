# Manual Técnico e Operacional: PREZZY 1.0

Este documento mapeia o funcionamento integral do PREZZY SaaS, detalhando seus processos, capacidades, integrações e responsabilidades operacionais.

---

## 1. O Que o PREZZY Faz (Capacidades)

O PREZZY é uma plataforma SaaS projetada para **gerar apresentações e documentos elegantes em formato PDF a partir de texto (briefing)** usando Inteligência Artificial.

* **Pipeline de Geração Automática:** Ele lê o briefing do usuário, usa Agentes de IA para criar o roteiro, redigir o conteúdo e escolher imagens relevantes da internet.
* **Renderização de Alta Fidelidade:** Em vez de usar geradores de PDF feios e padronizados, ele injeta os textos criados pela IA dentro de um template web real (HTML/CSS sofisticado) e usa o **Playwright** (um motor de navegador headless) para "tirar uma foto" do site e transformá-lo em um PDF com qualidade de design editorial.
* **Múltiplos Provedores de IA (Roteamento Dinâmico):** Ele não é preso à OpenAI. Se a OpenAI cair ou ficar cara, ele pode usar Groq, NVIDIA ou Google Gemini.
* **White-label / Brand Kit:** Permite que usuários alterem fontes, paleta de cores e subam suas próprias logos, customizando o design da apresentação final.
* **Sistema de Cobrança (Créditos):** Protege a plataforma contra abusos. Cada geração consome "Créditos" (💎). Sem créditos, o usuário é bloqueado.

---

## 2. O Que o PREZZY NÃO Faz (Limitações Atuais)

Para manter o foco no MVP (Minimum Viable Product), algumas coisas não são suportadas na versão 1.0:

* **Não gera `.PPTX` ou `.KEY` (PowerPoint/Keynote):** O sistema gera exclusivamente `.PDF`. Os documentos são para leitura ou apresentação estática.
* **Não tem Checkout Automático (Stripe/Cartão de Crédito):** Os usuários não podem comprar créditos sozinhos no sistema. Apenas o Superuser (você) pode adicionar créditos na conta deles pelo banco de dados ou painel.
* **Não altera templates brutalmente:** O design base do PDF é fixo. O usuário altera cores, logotipo e fontes, mas não a estrutura dos blocos.
* **Não faz RAG complexo com dezenas de PDFs:** Ele foi feito para textos de briefing curtos e diretos, não para analisar planilhas gigantescas de Excel ou livros em PDF de 500 páginas.

---

## 3. O Ecossistema (Arquitetura)

O sistema é dividido em três blocos operacionais:

1. **Frontend (Next.js - Render):** 
   A cara do sistema. Onde o usuário loga, vê a Sidebar (Workspace, Create, Account) e submete seus briefings.
2. **Backend (FastAPI + Redis - Render):** 
   O cérebro. Recebe o briefing, joga na Fila (Redis) para não sobrecarregar o servidor, chama os agentes de IA, monta o HTML, aciona o Playwright para gerar o PDF e salva no Storage.
3. **Database (Supabase):** 
   Onde tudo é guardado. Senhas, dados do usuário (`user_profiles`), status de projetos, arquivos em Storage (Bucket `uploads` para logos e `pdfs` para downloads) e a gestão de chaves de IA.

---

## 4. O Cérebro das IAs (LLM Factory)

O PREZZY é agnóstico. Ele decide qual IA usar com base nas **API Keys** que você configura no painel de Admin (`/dashboard/admin/api-keys`).

As ferramentas disponíveis são:
* **OpenAI (`gpt-4o-mini`):** A inteligência principal e mais barata para estruturar textos ricos.
* **Groq (`llama3`):** Extrema velocidade. Ideal se você quiser baratear os custos ao máximo.
* **NVIDIA:** (Opção Enterprise/Pesada configurada no LLM Factory).
* **Gemini:** A IA do Google (fallback).

**Como funciona a escolha?**
Se você colocar uma chave da OpenAI no painel Admin e ligar o interruptor (Ativo), o PREZZY usará a OpenAI. Se a chave estiver desativada ou não tiver saldo, o sistema pode tentar buscar o fallback.

---

## 5. Responsabilidades do Administrador

Como dono do SaaS (Superuser), sua operação não é de programação, mas de **Gestão e Monitoramento**:

### A. Gestão Financeira das IAs
O PREZZY gasta dinheiro a cada geração (alguns centavos de dólar). **Você precisa garantir que suas contas na OpenAI, Groq, etc., tenham saldo.** Se a OpenAI recusar o cartão, o PREZZY falha e notifica você no Telegram.

### B. Gestão de Chaves
Sempre que uma API Key rotacionar ou expirar, você deve entrar em `/dashboard/admin/overview` e cadastrar a nova chave. **NÃO PRECISA MEXER NO CÓDIGO.**

### C. Gestão de Créditos
Quando um cliente pagar (via Pix externo ou negociação), você acessa o painel do Supabase (ou no futuro o painel de Usuários do Admin) e altera o valor de "Créditos" daquele perfil para `100` ou `500`.

### D. Reagir aos Alertas (Observabilidade)
O `EventDispatcher` é seu guarda-costas. Ele manda mensagens no **Telegram** e salva na tabela `admin_audit_logs`.
O que você deve observar:
* **Erro no Redis:** Significa que o servidor de background caiu. (Reinicie o Render).
* **Playwright Crash:** Significa que o servidor do Backend ficou sem memória RAM para abrir o navegador (muito pesado).
* **Missing API Key:** Você esqueceu de cadastrar as chaves no Painel.

---

## 6. O Caminho Feliz do Usuário (Processo)

1. **Onboarding:** O usuário entra no site, cria uma conta.
2. **Setup:** Ele vai em "Brand Kit" (Criação > Brand Kit), sobe a Logo da empresa dele, escolhe a cor Primária (Ex: Azul) e a fonte "Inter".
3. **Criação:** Vai no Wizard, digita: *"Crie uma apresentação comercial para a minha agência de marketing digital focada em clínicas odontológicas."*
4. **Fila:** O status fica "Gerando...". Ele perde 1 Crédito 💎.
5. **Background:** O Backend cria os textos. O RAG pega imagens. O Playwright monta um site azul com a logo dele, tira o print em PDF e joga no Supabase.
6. **Entrega:** O PDF aparece na aba de "Downloads". Ele clica, baixa, e manda para o cliente dele.
