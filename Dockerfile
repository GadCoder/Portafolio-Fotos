# Build static export
FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (better cache)
COPY package*.json ./
RUN npm ci

# Build
COPY . .
# next.config.js is configured for output: "export"
RUN npm run build

# Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/out/ /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
