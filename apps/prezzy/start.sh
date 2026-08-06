#!/bin/bash

# start.sh - Inicializa o ambiente PREZZY

echo "🚀 Iniciando ambiente PREZZY (Base Infrastructure MVP)"

# Checa se o .env existe, senao copia o .env.example
if [ ! -f backend/.env ]; then
    echo "⚠️ Arquivo .env não encontrado no backend. Copiando do .env.example..."
    cp backend/.env.example backend/.env
    echo "⚠️ Lembre-se de configurar as suas chaves no arquivo backend/.env"
fi

echo "📦 Subindo containers via Docker Compose..."
docker-compose up --build -d

echo "✅ Ambiente iniciado."
echo "Logs da API: docker-compose logs -f api"
echo "Logs do Worker: docker-compose logs -f worker"
