#!/bin/bash

echo "Installing Python dependencies for Stock Backend..."
echo

# Check Python installation
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
    echo "Using python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
    echo "Using python"
else
    echo "ERROR: Python is not installed or not in PATH"
    echo "Please install Python from https://python.org"
    exit 1
fi

echo "Python version:"
$PYTHON_CMD --version
echo

echo "Installing requirements..."
$PYTHON_CMD -m pip install --upgrade pip
$PYTHON_CMD -m pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo
    echo "✅ Python dependencies installed successfully!"
    echo
    echo "You can now run the server with: npm start"
    echo "To test the scraper: node test-scraper.js"
else
    echo
    echo "❌ Failed to install Python dependencies"
    echo "Please check the error messages above"
    exit 1
fi
