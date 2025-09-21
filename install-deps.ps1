# Install dependencies for both client and server
Write-Host "Installing dependencies for Virtual Interview Platform..." -ForegroundColor Green

# Install root dependencies
Write-Host "`nInstalling root dependencies..." -ForegroundColor Yellow
npm install

# Install server dependencies
Write-Host "`nInstalling server dependencies..." -ForegroundColor Yellow
Set-Location server
npm install
Set-Location ..

# Install client dependencies
Write-Host "`nInstalling client dependencies..." -ForegroundColor Yellow
Set-Location client
npm install
Set-Location ..

Write-Host "`nAll dependencies installed successfully!" -ForegroundColor Green
Write-Host "Run 'npm run dev' to start the development servers." -ForegroundColor Cyan