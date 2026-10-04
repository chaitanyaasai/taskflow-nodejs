
# 1. Use the official Node.js runtime
FROM node:20-alpine

# 2. Set the working directory
WORKDIR /app

# 3. Copy dependency manifests
COPY package.json package-lock.json ./

# 4. Install production dependencies
RUN npm ci --omit=dev

# 5. Copy application source code
COPY . .

# 6. Document the application port
EXPOSE 3000

# 7. Start the application
CMD ["node", "app.js"]