# Artemis

Sistema de controle de estoque e vendas para uma loja de artesanato, planejado
com acessibilidade e facilidade de uso em mente.

## Tecnologias

- `apps/api`: NestJS e TypeScript, com API REST
- `apps/web`: React, TypeScript e Vite
- PostgreSQL com Prisma ORM
- npm workspaces para instalar e executar o monorepo

## Requisitos

- Node.js 20.19 ou superior e npm
- Docker Desktop (ou outro runtime compatível com Docker Compose)

## Começar

No PowerShell, a partir da raiz do repositório:

```powershell
Copy-Item .env.example apps/api/.env
docker compose up -d db
npm install
npm run db:migrate --workspace @artemis/api -- --name init
npm run dev
```

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

`npm run build`, `npm run lint`, `npm test` e `npm run test:e2e` executam as
verificações disponíveis nos workspaces.

## Estrutura

```text
apps/
  api/
    prisma/       Esquema inicial de produtos e vendas
    src/          API NestJS
  web/            Aplicação React
docker-compose.yml
```

O escopo inicial prepara infraestrutura, conexão com PostgreSQL e o modelo de
dados para produtos e vendas. CRUD, autenticação e relatórios mensais ainda
precisam ser implementados.

O frontend pode ser compilado como site estático (`npm run build`); a API exige
um serviço Node.js e PostgreSQL hospedados separadamente. Credenciais no
`docker-compose.yml` são exclusivamente locais e não devem ser usadas em
produção.