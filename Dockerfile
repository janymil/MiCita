# Simple Dockerfile for Node.js app
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy app source including .env file
COPY . .

# Build the application with environment variables from .env
RUN npm run build

# Expose port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]