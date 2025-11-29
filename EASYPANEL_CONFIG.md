# Configuração do Easypanel

## 🔧 Variáveis de Ambiente Necessárias

Adicione estas variáveis de ambiente no painel do Easypanel:

### Build Environment Variables

```
NODE_VERSION=22
NIXPACKS_NODE_VERSION=22
NIXPACKS_PKGS=nodejs-22_x
NODE_ENV=production
```

## 📋 Comandos de Build

### Install Command
```bash
npm ci --frozen-lockfile
```

### Build Command
```bash
npm run build
```

### Start Command
```bash
npm start
```

## 🎯 Versões Requeridas

- **Node.js**: 22.x ou superior
- **NPM**: 10.x ou superior
- **Vite**: 7.2.4 (requer Node.js 20.19+ ou 22.12+)

## 🔍 Verificação

Após o deploy, verifique os logs para confirmar:
```
node --version  # Deve mostrar v22.x.x
npm --version   # Deve mostrar 10.x.x
```

## 📦 Portas

- **Desenvolvimento Local**: 5173 (Vite dev server)
- **Preview Local**: 4173 (Vite preview)
- **Produção**: $PORT (variável dinâmica do Easypanel)

## 🚀 Fluxo de Deploy

1. **Push para Git** → Trigger automático (se configurado)
2. **Nixpacks detecta**:
   - `.nvmrc` (Node 22)
   - `.node-version` (Node 22)
   - `nixpacks.toml` (configuração explícita)
   - `package.json` engines (Node >=22.0.0)
3. **Install**: `npm ci --frozen-lockfile`
4. **Build**: `npm run build` → gera pasta `dist/`
5. **Start**: `serve -s dist -l $PORT` → serve arquivos estáticos

## ⚠️ Troubleshooting

Se ainda aparecer erro de Node.js 18:

1. **Limpe o cache do build** no Easypanel
2. **Force rebuild** (delete e recrie o serviço)
3. **Verifique os logs** para confirmar que o Node 22 está sendo usado
4. **Tente usar Dockerfile** como alternativa ao Nixpacks

## 🐳 Alternativa: Dockerfile

Se o Nixpacks continuar não funcionando, use este Dockerfile:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --frozen-lockfile

COPY . .
RUN npm run build

RUN npm install -g serve

EXPOSE 4173

CMD ["serve", "-s", "dist", "-l", "4173"]
```

Então no Easypanel, mude o tipo de build de "Nixpacks" para "Dockerfile".

