# Start the Nexus Intelligence Backend
Write-Host ">>> Starting Nexus Intelligence Backend..." -ForegroundColor Cyan

# Check if python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Python not found. Please install Python 3.10+." -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
Write-Host "[INIT] Checking dependencies..." -ForegroundColor Yellow
python -m pip install -r backend/requirements.txt --quiet

# Run the backend
Write-Host "[RUN] Backend starting on http://localhost:8765" -ForegroundColor Green
python -m backend.main
