FROM node:18-slim

WORKDIR /app

# Install git for npm dependencies that require it
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 3000

# Set HOST to 0.0.0.0 to ensure binding to all interfaces
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the application
CMD ["npm", "start"] 