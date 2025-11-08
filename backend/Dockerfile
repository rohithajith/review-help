FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies (use production deps by default)
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

ENV NODE_ENV=production
EXPOSE 5002

# Use npm start which runs `node index.js`
CMD ["npm", "start"]
