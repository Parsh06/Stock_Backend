@echo off
echo Installing Python dependencies for Stock Backend...
echo.

echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo Python not found with 'python' command, trying 'python3'...
    python3 --version
    if %errorlevel% neq 0 (
        echo Python not found with 'python3' command, trying 'py'...
        py --version
        if %errorlevel% neq 0 (
            echo ERROR: Python is not installed or not in PATH
            echo Please install Python from https://python.org
            pause
            exit /b 1
        ) else (
            set PYTHON_CMD=py
        )
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo.
echo Using Python command: %PYTHON_CMD%
echo.

echo Installing requirements...
%PYTHON_CMD% -m pip install --upgrade pip
%PYTHON_CMD% -m pip install -r requirements.txt

if %errorlevel% equ 0 (
    echo.
    echo ✅ Python dependencies installed successfully!
    echo.
    echo You can now run the server with: npm start
    echo To test the scraper: node test-scraper.js
) else (
    echo.
    echo ❌ Failed to install Python dependencies
    echo Please check the error messages above
)

echo.
pause
