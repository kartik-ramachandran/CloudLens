# Build stage
FROM node:18-alpine AS build
WORKDIR /app

# Set API URL as build argument (can be overridden at build time)
ARG REACT_APP_API_URL=https://aca-azurelens-be.victorioustree-30449962.australiaeast.azurecontainerapps.io/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the app (REACT_APP_API_URL will be baked into the bundle)
RUN npm run build

# Production stage
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy built assets from build stage
COPY --from=build /app/build .

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
