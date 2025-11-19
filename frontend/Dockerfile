# Gunakan Node.js image
FROM node:20-alpine

# Set direktori kerja
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy semua file
COPY . .

# Build aplikasi (optional, bisa juga run dev mode)
# RUN npm run build

# Expose port
EXPOSE 3000

# Start aplikasi
CMD ["npm", "run", "dev"]
