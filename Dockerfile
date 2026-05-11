# Use official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy all source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server
CMD ["npm", "run", "dev"]
