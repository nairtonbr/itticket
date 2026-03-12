FROM node:20-slim

WORKDIR /app

# Instalar dependências para o SQLite
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

# Build do frontend
RUN npm run build

# Expor a porta 3000
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "run", "start"]
