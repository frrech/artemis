# Artemis

Sistema de controle de estoque e vendas para uma loja de artesanato, planejado
com acessibilidade e facilidade de uso em mente.

## Tecnologias

- `apps/api`: NestJS e TypeScript, com API REST
- `apps/web`: React, TypeScript e Vite
- SQLite ou PostgreSQL com Prisma ORM
- npm workspaces para instalar e executar o monorepo

## Requisitos

- Node.js 20.19 ou superior e npm
- SQLite (opção padrão, sem instalação ou serviço adicional) ou PostgreSQL 17
  ou superior

## Começar

Por padrão, o projeto usa SQLite e não precisa de Docker nem de um servidor de
banco separado. No PowerShell, a partir da raiz do repositório:

```powershell
if (!(Test-Path apps/api/.env)) { Copy-Item .env.example apps/api/.env }
# Configure JWT_SECRET and INITIAL_SETUP_SECRET in apps/api/.env.
npm install
npm run db:migrate --workspace @artemis/api -- --name init
npm run dev
```

O banco será criado em `apps/api/prisma/dev.db`. O arquivo `.env.example` usa
`DATABASE_URL="file:./dev.db"`; se `apps/api/.env` já existir, atualize essa
variável manualmente para usar SQLite.

### PostgreSQL (opcional)

Para usar PostgreSQL em vez de SQLite, inicie um servidor local ou use Docker
Compose. Com Docker:

```powershell
docker compose up -d db
```

Instale o PostgreSQL e crie um banco `artemis` e um usuário local com as
credenciais definidas no `docker-compose.yml`, ou atualize `DATABASE_URL` em
`apps/api/.env` para seu banco local. Depois gere o cliente Prisma para
PostgreSQL e aplique as migrações:

```powershell
npm run db:generate:postgres
npm run db:migrate:postgres --workspace @artemis/api -- --name init
```

Use PostgreSQL's `DATABASE_URL` while running the API. The SQLite and
PostgreSQL schemas and migration histories are separate; generate the client
for the database you intend to run before starting the app.

Abra o endereço mostrado pelo Vite (normalmente
http://localhost:5173). O frontend encaminha `/api` para a API em
http://localhost:3000. O endpoint de verificação é
http://localhost:3000/api/health.

Os comandos do banco de dados podem ser executados separadamente:

```powershell
npm run db:generate
npm run db:migrate --workspace @artemis/api -- --name nome-da-migracao
npm run db:studio
```

Para PostgreSQL, use os equivalentes `npm run db:generate:postgres`,
`npm run db:migrate:postgres` e `npm run db:studio:postgres`.

`npm run build`, `npm run lint`, `npm test` e `npm run test:e2e` executam as
verificações disponíveis nos workspaces.

## Autenticação e funcionalidades

Antes do primeiro acesso, defina `INITIAL_SETUP_SECRET` na API e compartilhe
esse código somente com a pessoa responsável pela configuração. Ela usa o
código para criar a conta inicial da loja com um e-mail e uma senha de pelo
menos 10 caracteres. O cadastro fica disponível somente enquanto ainda não
existe uma conta, evitando que novas contas públicas acessem os dados da loja.
A API armazena somente o hash da senha e emite um token com validade de 8
horas. As rotas de produtos, vendas e relatórios exigem esse token.

O catálogo permite criar, consultar, editar e remover produtos. Vendas também
podem ser criadas, consultadas, editadas e removidas; cada alteração ajusta o
estoque dentro de uma transação, e produtos com vendas registradas não podem
ser removidos. A visão geral mostra o valor e a quantidade de vendas de cada
mês do ano atual.

Configure `JWT_SECRET` e `INITIAL_SETUP_SECRET` com valores aleatórios
independentes, cada um com pelo menos 32 caracteres.
Para publicar o frontend e a API em origens diferentes, defina `WEB_ORIGIN` na
API e `VITE_API_URL` na compilação do frontend (por exemplo,
`https://api.exemplo.com/api`). Em desenvolvimento, o Vite encaminha `/api`
para `http://localhost:3000`.

Rotas autenticadas: `GET/POST /api/products`, `GET/PATCH/DELETE
/api/products/:id`, `GET/POST /api/sales`, `GET/PATCH/DELETE /api/sales/:id` e
`GET /api/reports/monthly-sales?year=2026`. A autenticação está disponível em
`POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/setup` e
`GET /api/auth/me`.

## Estrutura

```text
apps/
  api/
    prisma/       Esquema inicial de produtos e vendas
    src/          API NestJS
  web/            Aplicação React
docker-compose.yml
```

O frontend pode ser compilado como site estático (`npm run build`); a API exige
um serviço Node.js e um banco SQLite ou PostgreSQL. Credenciais no
`docker-compose.yml` são exclusivamente locais e não devem ser usadas em
produção.