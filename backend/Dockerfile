# Usar Node.js 18
FROM node:18-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio para la base de datos
RUN mkdir -p database

# Exponer puerto
EXPOSE $PORT

# Comando para iniciar
CMD ["npm", "start"]
