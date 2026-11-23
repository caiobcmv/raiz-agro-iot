# Raiz - Front-End

Plataforma web de **monitoramento climático e logístico de frutas** (Manga, Uva e Melão), do campo ao porto. Sensores IoT (ESP32 + DHT11 via ThingSpeak) alimentam um banco PostgreSQL; uma API FastAPI expõe os dados com autenticação JWT e controle de acesso por perfil; e um dashboard em JavaScript puro exibe leituras em tempo real, alertas, previsões de IA, rastreabilidade de lotes e rotas de exportação.

---

##  Sumário

- [Visão geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Repositórios do projeto](#-repositórios-do-projeto)
- [Funcionalidades](#-funcionalidades)
- [Perfis de acesso (RBAC)](#-perfis-de-acesso-rbac)
- [Tecnologias](#-tecnologias)
- [Estrutura deste repositório](#-estrutura-deste-repositório)
- [Como executar](#-como-executar)
- [Telas e rotas do front-end](#-telas-e-rotas-do-front-end)
- [Deploy](#-deploy)
- [Segurança](#-segurança)
- [Licença](#-licença)

---

##  Visão geral

O RAIZ acompanha a temperatura e a umidade (do ar e do solo) em tempo real e compara cada leitura com as **faixas ideais por fruta e etapa** (`campo`, `armazenamento` e `transporte`). Quando uma leitura sai da faixa, o sistema gera alertas automáticos, estima riscos e prejuízos com apoio de IA e acompanha a viagem dos lotes de Petrolina até os portos de **Suape, Pecém, Salvador e Natal**.

---

##  Arquitetura

```text
ESP32 / DHT11
      │
  ThingSpeak ──► Serviço de ingestão (polling + validação) ──┐
                                                             ▼
  Open-Meteo ──►  API FastAPI (JWT + RBAC + 2FA)  ◄────►  PostgreSQL
                         │                              (iot_db)
                         ▼
              Front-end SPA (este repositório)
                         │
             Agendador + LLM (Gemini): riscos, previsões, pareceres e alertas preditivos
```

---

##  Repositórios do projeto

O RAIZ é dividido em três partes que trabalham juntas:

| Parte | Repositório | Responsabilidade |
| :--- | :--- | :--- |
| **Front-end + servidor local** | este repositório | Interface web (SPA), servidor Node.js estático/proxy e scripts de inicialização |
| **Back-end** | [`rafaellins7/iot-backend-`](https://github.com/rafaellins7/iot-backend-) | API FastAPI, ingestão do ThingSpeak, agendador e integração com IA |
| **Banco de dados** | [`LorenaLira05/iot_db`](https://github.com/LorenaLira05/iot_db) | Scripts SQL do PostgreSQL (schema, triggers, views, seed, autenticação) |

> A pasta `iot-backend/` deste repositório é o ponto de encaixe do back-end usado pelos scripts `.bat`. Coloque nela o conteúdo do repositório `iot-backend-`. A pasta `iot_db-main/` contém uma cópia dos scripts SQL do banco.

---

##  Funcionalidades

- **Dashboard em tempo real** com KPIs, gráfico de temperatura/umidade (24 h), clima e funil de lotes, com atualização via SSE.
- **Sensores IoT** de ar e solo (ThingSpeak DHT11/ESP32), com status, telemetria e cadastro.
- **Rede ESP32 e topologia** de campo (LoRa) com mapa da propriedade.
- **Leituras e histórico de safra** com cálculo de VPD (kPa), conformidade com a faixa e exportação em CSV.
- **Rastreabilidade de lotes** do campo ao porto.
- **Logística e portos** com mapa interativo (Leaflet) e rotas de Petrolina até os portos.
- **Central de alertas** reativos (saída de faixa, via trigger no banco) e preditivos (gerados por modelos), com níveis de severidade.
- **Previsões e IA**: risco climático, janela de colheita, irrigação, prejuízo, dados de mercado e parecer automático por LLM.
- **Relatórios e auditoria** com laudos e trilha de acesso (`log_acesso`).
- **Calibração e parâmetros IoT**, **regras agronômicas** e **faixas ideais** por fruta e etapa.
- **Gestão de usuários** com perfis, preferências (tema, efeitos visuais, tempo real) e fluxo completo de conta.
- **Autenticação robusta**: login com JWT, refresh token com rotação, **2º fator por e-mail (código de 6 dígitos)**, primeiro acesso, recuperação de senha e bloqueio temporário de conta.

---

##  Perfis de acesso (RBAC)

| Perfil | Permissões |
| :--- | :--- |
| **Administrador** | Acesso total: usuários, sensores, auditoria e todas as escritas |
| **Analista de Dados** | Consulta e edita (sem excluir) sensores, alertas, faixas, calibração e relatórios; acessa resumos agregados de todos os donos |
| **Produtor/Exportador** | Somente leitura, restrita aos próprios dados (lotes, dashboard, viagens, mercado e recomendações) |

---

##  Tecnologias

| Camada | Tecnologia |
| :--- | :--- |
| Front-end | HTML5, CSS3, JavaScript modular (ES Modules), SPA com roteador por hash |
| Bibliotecas | Chart.js 4.4, Leaflet 1.9, Lucide Icons, Google Fonts (Space Grotesk, Plus Jakarta Sans, Inter) |
| Servidor local | Node.js (sem dependências externas) |
| Back-end | Python, FastAPI, Uvicorn, Pydantic, psycopg2 (SQL direto), bcrypt/argon2, PyJWT |
| Banco | PostgreSQL (PL/pgSQL para funções e triggers) |
| Integrações | ThingSpeak, Open-Meteo, Google Gemini, SMTP (e-mail 2FA) |
| Deploy | Vercel (front-end) |

---

##  Estrutura deste repositório

```text
raiz-agro-iot/
├── frontend/
│   ├── assets/
│   │   ├── css/             # estilos (variáveis, componentes, dashboard, login, analista)
│   │   ├── images/          # logo, mapas, topologias e imagens de campo
│   │   └── js/
│   │       ├── components/  # sidebar, header, modal, toast, modal de acesso negado
│   │       ├── views/       # uma view por tela (dashboard, sensores, lotes, alertas...)
│   │       ├── utils/       # utilitários de exportação
│   │       ├── api.js       # cliente da API (JWT + refresh automático)
│   │       ├── auth.js      # sessão e perfis
│   │       ├── router.js    # roteador SPA
│   │       └── live-telemetry.js / dashboard-stream.js  # tempo real
│   ├── pages/               # fragmentos e páginas HTML
│   ├── index.html
│   └── vercel.json
├── iot-backend/             # encaixe do back-end (repositório iot-backend-)
├── iot_db-main/             # scripts SQL do banco (repositório iot_db)
├── server.js                # servidor Node: estáticos + proxy /api → :8000
├── INICIAR_SERVIDOR.bat     # sobe back-end e front-end (Windows)
├── INICIAR_BACKEND.bat      # sobe somente o back-end (Windows)
├── index.html               # redireciona para o front-end
└── vercel.json
```

---

##  Como executar

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18+
- [Python](https://www.python.org/) 3.10+
- [PostgreSQL](https://www.postgresql.org/)
- Um canal do [ThingSpeak](https://thingspeak.com/) com o ESP32/DHT11 enviando dados (opcional para testes com o seed)

### 1. Clonar o repositório

```bash
git clone https://github.com/caiobcmv/raiz-agro-iot.git
cd raiz-agro-iot
```

### 2. Preparar o banco de dados

Crie um banco no PostgreSQL e rode os scripts de `iot_db-main/` **nesta ordem**, parando no primeiro erro:

1. `schema.sql`
2. `implementação_ia.sql`
3. `restricoes.sql`
4. `seed.sql`
5. `triggers.sql`
6. `views.sql`
7. `auth.sql` (tabelas de refresh token e 2FA por e-mail)
8. `migracao_preferencias.sql` (perfil e preferências do usuário)

> Datas são gravadas em UTC; o front converte para `America/Recife`.

### 3. Configurar o back-end

Coloque o conteúdo do repositório [`iot-backend-`](https://github.com/rafaellins7/iot-backend-) na pasta `iot-backend/` e configure o ambiente:

```bash
cd iot-backend
python -m venv venv
venv\Scripts\activate          # Windows  (Linux/Mac: source venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env           # Windows: copy .env.example .env
```

Preencha o `.env`. As principais variáveis:

| Variável | Descrição |
| :--- | :--- |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Conexão com o PostgreSQL |
| `THINGSPEAK_CHANNEL_ID`, `THINGSPEAK_READ_API_KEY` | Canal de sensores (a chave só é necessária para canais privados) |
| `SENSOR_ID` | `id_sensor` que recebe as leituras do canal |
| `CORS_ORIGINS` | Origens liberadas (ex.: `http://localhost:5173`) |
| `JWT_SECRET`, `EMAIL_OTP_KEY` | Segredos do JWT e do código 2FA |
| `LOGIN_2FA_EMAIL` | Ativa (`true`) ou desativa (`false`) o 2º fator por e-mail |
| `SMTP_*`, `EMAIL_FROM`, `EMAIL_MODO_DEV` | Envio de e-mails (em modo dev, não é necessário SMTP real) |
| `GEMINI_API_KEY`, `LLM_MODEL` | Chave e modelo da IA (pareceres e previsões) |
| `CLIMA_LATITUDE`, `CLIMA_LONGITUDE` | Coordenadas da propriedade para a previsão do tempo |
| `AGENDADOR_ATIVO` | Liga as rotinas automáticas de risco, irrigação, prejuízo e alertas preditivos |

>  Nunca versione o `.env`. Ele já está no `.gitignore`.

### 4. Iniciar a aplicação

#### Windows (recomendado)

Dê dois cliques em **`INICIAR_SERVIDOR.bat`**. Ele libera as portas 5173 e 8000, inicia o back-end FastAPI, abre o navegador em `http://localhost:5173/#/login` e sobe o servidor do front-end.

Para subir só o back-end, use `INICIAR_BACKEND.bat`.

#### Manual (qualquer sistema)

Em terminais separados:

```bash
# 1) API (porta 8000) — a partir de iot-backend/
uvicorn src.api.app:app --reload --port 8000

# 2) Coleta contínua do ThingSpeak + agendador de IA — a partir de iot-backend/
python -m src.main

# 3) Front-end (porta 5173) — a partir da raiz do repositório
node server.js
```

| Serviço | URL |
| :--- | :--- |
| Front-end | http://localhost:5173/#/login |
| API | http://localhost:8000 |
| Documentação da API (Swagger) | http://localhost:8000/docs |

> O `server.js` também encaminha requisições `/api/*` para a API na porta 8000. A coleta (`python -m src.main`) e a API são processos independentes: rode os dois para receber dados novos com o dashboard aberto.

### URL da API customizada

O front-end usa `http://localhost:8000` por padrão. Para apontar para outra API, defina no console do navegador:

```js
localStorage.setItem('API_URL', 'https://sua-api.exemplo.com');
```

---

## Telas e rotas do front-end

| Rota | Tela |
| :--- | :--- |
| `#/login` | Acesso à conta, com 2º fator por e-mail |
| `#/primeiro-acesso`, `#/recuperar-senha`, `#/verificacao`, `#/redefinir-senha`, `#/senha-alterada`, `#/conta-bloqueada` | Fluxo completo de conta e senha |
| `#/dashboard` | Visão geral do sistema |
| `#/sensores` | Sensores e telemetria de campo (visão de administração para o perfil Admin) |
| `#/rede-esp32` | Rede ESP32 e topologia |
| `#/leituras` | Histórico de safra |
| `#/lotes` | Rastreabilidade de lotes |
| `#/alertas` | Central de alertas e incidentes |
| `#/previsoes` | Modelos de IA e mercado |
| `#/relatorios` | Relatórios e auditoria |
| `#/configuracoes` | Configurações do sistema e do perfil |
| `#/calibracao` | Calibração e parâmetros IoT |
| `#/regras-agronomicas` | Regras agronômicas vigentes |
| `#/usuarios` | Gerenciamento de usuários (Admin) |
| `#/auditoria` | Auditoria e logs operacionais (Admin) |

---

##  Deploy

O front-end está preparado para a **Vercel**: o `vercel.json` da raiz reescreve as rotas para `frontend/index.html` e para os assets. O banco foi pensado para PostgreSQL gerenciado (como Neon ou Render), e a API precisa de uma URL pública configurada em `API_URL`, com `CORS_ORIGINS` liberando o domínio do front-end.

---

##  Segurança

- Senhas com hash **bcrypt/argon2**.
- **JWT** com refresh token rotativo: apenas o hash do token é salvo, e a reutilização de um token já usado revoga toda a sessão.
- **2FA por e-mail**: código de 6 dígitos armazenado apenas como HMAC, com validade de 10 minutos, uso único e limite de tentativas.
- **RBAC** aplicado no back-end por perfil e método HTTP.
- Consultas SQL parametrizadas, CORS restrito e auditoria das ações em `log_acesso`.
- Exclusão física de usuários bloqueada por trigger (use `status = 'inativo'`).
- Segredos ficam em variáveis de ambiente e nunca são versionados.

---

##  Licença

Projeto acadêmico, desenvolvido para fins educacionais.
