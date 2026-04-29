FROM node:20-alpine AS client-build
WORKDIR /app/client
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY backend/ ./

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-build /app/backend /app/backend
COPY --from=client-build /app/client/dist /app/client/dist

EXPOSE 8080
CMD ["node", "backend/index.js"]
