### Stage 1: build React app
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
# Install all deps (including dev deps needed for build)
RUN npm ci
COPY . .
RUN npm run build

### Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
