FROM node:20-alpine AS client-build
WORKDIR /app/client
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
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
