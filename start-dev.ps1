# Development startup script
Write-Host "Starting Virtual Interview Platform..." -ForegroundColor Green

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies first..." -ForegroundColor Yellow
    npm run install:all
}

# Start both client and server
Write-Host "Starting development servers..." -ForegroundColor Cyan
Write-Host "Server will run on http://localhost:5000" -ForegroundColor Blue
Write-Host "Client will run on http://localhost:3000" -ForegroundColor Blue

npm run dev