#!/bin/bash

echo "Starting Python backend for Space Weather monitoring..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set environment variables
export FLASK_APP=app.py
export FLASK_ENV=development
export PYTHON_PORT=5001

# Start the Flask application
echo "Starting Flask server on port $PYTHON_PORT..."
python app.py