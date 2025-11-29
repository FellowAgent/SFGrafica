# ==============================================================================
# Fellow Sync Suite - Dockerfile para Produção
# ==============================================================================
# VERSÕES MAIS RECENTES:
# - Node.js 23 (Current/Latest) - Alpine
# - Nginx 1.27 (Mainline/Latest) - Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: Build da aplicação React/Vite
# ------------------------------------------------------------------------------
FROM node:23-alpine AS builder

# Metadata
LABEL stage=builder

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências primeiro (melhor cache)
COPY package.json package-lock.json* ./

# Instalar dependências
RUN npm ci --ignore-scripts && npm cache clean --force

# Copiar código fonte
COPY . .

# Build de produção
ENV NODE_ENV=production
RUN npm run build

# Verificar se o build foi bem-sucedido
RUN test -f /app/dist/index.html && echo "✓ Build OK: index.html encontrado"

# ------------------------------------------------------------------------------
# STAGE 2: Servidor Nginx (Produção)
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Metadata
LABEL maintainer="Fellow CRM"
LABEL description="Fellow CRM - Plataforma B2B"

# Remover configuração padrão
RUN rm -f /etc/nginx/conf.d/default.conf

# Copiar configuração nginx customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Verificar configuração nginx
RUN nginx -t && echo "✓ Nginx config OK"

# Porta
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --spider http://localhost/health || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]
