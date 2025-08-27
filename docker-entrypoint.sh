#!/bin/sh
set -e

echo "Starting Space Weather Web Application..."

# Run database migrations if DATABASE_URL is set
if [ ! -z "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    npx prisma migrate deploy || {
        echo "Warning: Database migration failed. The application will start but database features may not work."
        echo "Please ensure your database is running and DATABASE_URL is correctly configured."
    }
fi

# Start the application
exec "$@"