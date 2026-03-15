FROM oven/bun:1.1-slim

WORKDIR /app

# Instalar dependencias primero (capa cacheada)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copiar código fuente
COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]