# EVOAIQU - one-command setup for Windows (PowerShell)
#
# Run from the repo root:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#
# What it does: checks Node.js, installs the packages, creates data\.env.local
# from the template. It never overwrites an existing .env.local.
# What it does NOT do: create your Supabase project or run the SQL migrations.
# Those need your own keys. See SETUP.md, steps 4 to 7.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Join-Path $root "data"

function Fail($message) {
    Write-Host ""
    Write-Host "ERROR: $message" -ForegroundColor Red
    exit 1
}

Write-Host "== EVOAIQU setup ==" -ForegroundColor Cyan

# 1. Node.js 20.9 or newer
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) { Fail "Node.js is not installed. Get it from https://nodejs.org, then open a NEW terminal and run this again." }

$nodeVersion = (node -v).TrimStart("v")
$parts = $nodeVersion.Split(".")
$major = [int]$parts[0]
$minor = [int]$parts[1]
if (($major -lt 20) -or ($major -eq 20 -and $minor -lt 9)) {
    Fail "Node.js $nodeVersion is too old. This project needs 20.9 or newer."
}
Write-Host "Node.js $nodeVersion OK"

if (-not (Test-Path (Join-Path $app "package.json"))) { Fail "Cannot find data\package.json. Run this script from the repo root." }

# 2. Install packages
Write-Host "Installing packages (this can take a few minutes)..."
Push-Location $app
try {
    npm install
    if ($LASTEXITCODE -ne 0) { Fail "npm install failed. Read the messages above." }
} finally {
    Pop-Location
}

# 3. Environment file
$envFile = Join-Path $app ".env.local"
$envExample = Join-Path $app ".env.example"
if (Test-Path $envFile) {
    Write-Host "data\.env.local already exists. Leaving it as it is."
} else {
    Copy-Item $envExample $envFile
    Write-Host "Created data\.env.local from the template."
}

Write-Host ""
Write-Host "Done with the automatic part." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Create a Supabase project and put its keys in data\.env.local   (SETUP.md steps 4 and 5)"
Write-Host "  2. Run the 17 SQL files in data\supabase\migrations in order      (SETUP.md step 6)"
Write-Host "  3. Set the sign-in redirect URLs in Supabase                       (SETUP.md step 7)"
Write-Host "  4. Start the app:   cd data ; npm run dev     then open http://localhost:3000"
Write-Host ""
Write-Host "Want to try it first without Supabase? Start it now - the solo games work without keys."
