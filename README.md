# 🛒 MicroCart — Ecossistema ecommerce baseado em Microsserviços

O **MicroCart** é uma plataforma de e-commerce moderna baseada em uma **Arquitetura de Microsserviços**. O sistema foi desenhado para garantir isolamento completo de dados, utilizando o padrão *Database-per-Service*, comunicação inteligente entre serviços e um motor nativo de recomendações por faixa de preço.

---

## Arquitetura do Sistema e Portas de Rede

O ecossistema é dividido em uma camada de apresentação (Frontend), um ponto central de roteamento seguro (API Gateway) e três microsserviços independentes apoiados por contêineres Docker.

| Serviço / Componente | Tecnologia | Porta Padrão | Descrição / Responsabilidade |
| :--- | :--- | :--- | :--- |
| **Frontend Client** | React.js | `5173` | Interface reativa do usuário e painel administrativo. |
| **API Gateway** | Node.js / Express | `8080` | Ponto de entrada único. Roteia o tráfego externo (*North-South*). |
| **product-service** | Node.js / MongoDB | `3001` | Gerencia catálogo, estoque, avaliações e o motor de recomendações. |
| **auth-service** | Node.js / Banco Relacional | `3002` | Gerencia usuários, permissões, JWT e integra com o ViaCEP. |
| **order-service** | Node.js / MongoDB | `3003` | Processa o checkout e comanda a baixa de estoque (*East-West*). |

---

## 🛑 Pré-requisitos para Execução

Antes de iniciar a aplicação, certifique-se de ter instalado em sua máquina:

1. **Node.js** (Versão 18 ou superior) -> [Download Node.js](https://nodejs.org/)
2. **Docker & Docker Compose** -> [Download Docker](https://www.docker.com/)

---

## Como Executar o Projeto (Passo a Passo)

Siga as instruções abaixo no terminal para clonar, configurar e rodar toda a malha de microsserviços de forma integrada.

### 1. Clonar o Repositório
```bash
git clone https://github.com/JhonathanMilk/MicroCart.git
cd MicroCart
```

### 2. Instalar Dependências Centrais

Na pasta raiz do projeto (onde está o arquivo package.json principal que gerencia o Concurrently):
```bash
npm install
```

### 3. Subir os Bancos de Dados Isolados (Docker)

O projeto utiliza o Docker para inicializar as instâncias de bancos de dados em ambientes totalmente isolados, sem a necessidade de instalações nativas ou configurações manuais de portas no seu sistema operacional.
```bash
docker-compose up -d
```
*Este comando lerá o arquivo docker-compose.yml e deixará o MongoDB e o PostgreSQL prontos para uso em segundo plano.*

### 4. Inicializar a Malha de Microsserviços em Paralelo

Utilizando a biblioteca Concurrently, você não precisa abrir múltiplos terminais para rodar cada serviço. Inicie o API Gateway e todos os backends em paralelo com um único comando na raiz:
```bash
npm start
```
*O terminal exibirá logs unificados em tempo real, separados por tags coloridas para cada microsserviço.*

### 5. Inicializar o Frontend (Interface React)

Abra uma nova janela ou aba de terminal, navegue até a pasta dedicada ao frontend e inicialize a interface do usuário:
```bash
cd frontend
npm install
npm run dev
```
Após a inicialização, abra o seu navegador e acesse: http://localhost:5173 (ou a porta local gerada pelo seu servidor React/Vite) para interagir com o ecossistema completo.

## Povoamento Inicial dos Bancos e Primeiro Acesso (Seed)

Como os contêineres Docker sobem com os bancos de dados completamente zerados, o ecossistema do **MicroCart** foi projetado com uma mecânica automatizada de autoajuste e primeiro acesso para facilitar os testes (Isso será mudado posteriormente, claro).

### 🔑 Conta Administradora Padrão (Injeção Automática)
Assim que o **`auth-service`** é inicializado e sincroniza com o PostgreSQL no Docker, o próprio sistema verifica se a tabela de credenciais está vazia. Caso esteja, ele cria automaticamente um usuário administrador master com os seguintes dados:

* **E-mail do Admin:** `admin@microcart.com`
* **Senha padrão:** `admin123`

> 🔓 **Como usar:** Acesse a tela de Login no Frontend, digite essas credenciais e entre. O sistema gerará o Token JWT com a role `admin`, liberando imediatamente a aba **"Painel Admin"** no menu superior da aplicação.

---

### Como cadastrar a carga inicial de produtos?
Com o seu acesso de Administrador liberado através da conta padrão acima, o catálogo pode ser alimentado diretamente pela interface:

1. Clique na opção **Painel Admin** no cabeçalho da loja.
2. Acesse o formulário de **Cadastrar Produtos**.
3. Insira os dados dos itens (Nome, Preço, Estoque e URL da Imagem). 

Ao salvar, o Frontend enviará os dados via API Gateway para o **`product-service`**, que salvará tudo no MongoDB. A partir desse momento, a página inicial (página de produtos) e o Sistema de Paginação ganharão vida!
