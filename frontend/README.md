# RAIZ Agro IoT - Frontend

Frontend moderno em **HTML5, CSS3 e JavaScript modular (ES Modules)** para a plataforma **RAIZ - Monitoramento Climático e Logístico de Frutas**.

Desenvolvido com fidelidade visual aos estilos do Figma (tipografia Space Grotesk, Plus Jakarta Sans e Inter, paleta verde floresta `#193D2E` e `#15803D`, layout em curva orgânica e fluxo de autenticação MFA).

---

## 🚀 Como Executar o Frontend

Como é uma Single Page Application (SPA) pura baseada em módulos ES6, você pode executá-la com qualquer servidor web estático:

### Opção 1: VS Code Live Server
Clique com o botão direito em `frontend/index.html` e selecione **"Open with Live Server"**.

### Opção 2: Python
No terminal, execute:
```bash
python -m http.server 5173
```
E acesse: [http://localhost:5173/frontend/index.html](http://localhost:5173/frontend/index.html)

### Opção 3: Node.js / npx
```bash
npx serve .
```

---

## 🔌 Conexão com o Backend FastAPI

O frontend se conecta automaticamente à API FastAPI rodando em `http://localhost:8000`:
- **Login e MFA (2FA)**: `POST /auth/login`, `POST /auth/2fa/verify`, `POST /auth/2fa/reenviar`
- **Dashboard**: `GET /dashboard/resumo`
- **Sensores**: `GET /sensores/`, `POST /sensores/`
- **Telemetria**: `GET /sensor_leituras/resumo-geral`
- **Lotes**: `GET /lotes/`, `POST /lotes/`
- **Logística & Portos**: `GET /viagens/`
- **Alertas**: `GET /alertas/`, `PATCH /alertas/{id}/status`
- **Parâmetros**: `GET /config_parametros/`

> **Modo Demonstração Automático:** Se o backend ainda não estiver em execução, o frontend ativa o modo demonstração com dados realistas (Manga Tommy, Uva, Melão, ThingSpeak DHT11 ESP32, Portos de Pecém e Suape), permitindo testar e navegar por todas as telas e funcionalidades sem travamentos.

---

## 📂 Estrutura de Rotas e Telas

| Rota | Tela | Descrição |
| --- | --- | --- |
| `#/login` | **Acesse sua Conta** | Tela de login fiel ao Figma com imagem do campo, curva orgânica e modal de 2FA (MFA). |
| `#/dashboard` | **Dashboard Geral** | Indicadores em tempo real (KPIs), gráfico Chart.js de temperatura e umidade 24h, clima e funil de lotes. |
| `#/sensores` | **Sensores IoT** | Lista de sensores (ThingSpeak DHT11, solo e reefer), status, telemetria e cadastro de novos sensores. |
| `#/leituras` | **Leituras & Telemetria** | Tabela com histórico detalhado, cálculo de VPD (kPa), conformidade e exportação em CSV. |
| `#/lotes` | **Lotes de Frutas** | Rastreabilidade de lotes de Manga, Uva e Melão, status e cadastro com modal. |
| `#/viagens` | **Logística & Portos** | Mapa interativo Leaflet com rotas rodoviárias para os portos de Suape, Pecém, Salvador e Natal, e monitoramento da temperatura do container. |
| `#/alertas` | **Central de Alertas** | Alertas reativos e preditivos com níveis de severidade e ação para resolver. |
| `#/previsoes` | **Previsões & IA** | Estimativa de shelf-life, risco de perda financeira e cotações de mercado. |
| `#/relatorios` | **Relatórios & Auditoria** | Emissão de laudos fitossanitários e trilha de auditoria (`log_acesso`). |
| `#/configuracoes`| **Faixas & Parâmetros** | Ajuste dos limites ideais de temperatura e umidade por fruta e etapa. |
| `#/usuarios` | **Gestão de Usuários** | Controle de acessos e permissões (RBAC) para Administradores. |

---

## 🛠 Bibliotecas Utilizadas

- **Chart.js 4.4**: Gráficos de telemetria climática e histórico.
- **Leaflet 1.9**: Cartografia e rastreamento geoespacial de carretas e portos.
- **Lucide Icons**: Ícones minimalistas modernos.
- **Google Fonts**: Space Grotesk, Plus Jakarta Sans e Inter.

