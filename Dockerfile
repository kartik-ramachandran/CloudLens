# ═══════════════════════════════════════════════════════════════════════════════
# CloudLens — Combined FE + BE image
# nginx (port 80) serves the React SPA and proxies /api/* to dotnet (port 8080)
# supervisord manages both processes inside the single container
# ═══════════════════════════════════════════════════════════════════════════════

# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-alpine AS fe-build
WORKDIR /app

# API calls go to /api (relative — nginx proxies to dotnet on the same host)
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY frontend/cloudlens-ui/package*.json ./
RUN npm ci --silent

COPY frontend/cloudlens-ui/ .
RUN npm run build

# ── Stage 2: Build .NET backend ───────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS be-build
WORKDIR /src

COPY backend/CloudLens.API/CloudLens.API.csproj ./
RUN dotnet restore

COPY backend/CloudLens.API/ ./
RUN dotnet publish -c Release -o /app/publish

# ── Stage 3: Combined runtime ─────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0

# Install nginx + supervisor (apt cache cleaned in same layer)
RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx supervisor \
 && rm -rf /var/lib/apt/lists/*

# ── .NET API ──────────────────────────────────────────────────────────────────
WORKDIR /app
COPY --from=be-build /app/publish .

# ── React static files ────────────────────────────────────────────────────────
COPY --from=fe-build /app/build /usr/share/nginx/html

# ── nginx config ──────────────────────────────────────────────────────────────
COPY nginx.combined.conf /etc/nginx/conf.d/default.conf
# Remove the default site so our config is the only one
RUN rm -f /etc/nginx/sites-enabled/default

# ── supervisord config ────────────────────────────────────────────────────────
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ── Runtime dirs ──────────────────────────────────────────────────────────────
RUN mkdir -p /app/data /var/log/supervisor

# ACA ingress → port 80 (nginx); dotnet listens on 8080 internally only
EXPOSE 80

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ConnectionStrings__DefaultConnection="Data Source=/app/data/cloudlens.db"

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
