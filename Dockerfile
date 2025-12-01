# Build-Stage für Node.js LTS
FROM node:20-bullseye-slim AS builder

# Arbeitsverzeichnis setzen
WORKDIR /app

# Nur package.json und package-lock.json kopieren für bessere Layer-Caching
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Production-Stage
FROM node:20-bullseye-slim

# Non-root User erstellen
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Arbeitsverzeichnis setzen
WORKDIR /app

# Dependencies von Builder-Stage kopieren
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Source-Code kopieren
COPY --chown=nodejs:nodejs . .

# User wechseln
USER nodejs

# Port freigeben
EXPOSE 3000

# Server starten
CMD ["node", "server.js"]