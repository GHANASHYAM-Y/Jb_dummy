@echo off
setlocal
cd /d "%~dp0data"

if not exist node_modules (
  echo node_modules not found, installing dependencies...
  call npm install
)

if not exist .env.local (
  echo WARNING: data\.env.local is missing. Copy data\.env.example to data\.env.local and fill in your Supabase keys.
)

echo Dev server:  http://localhost:3000
echo Prod server: http://localhost:3001  (builds first, takes a couple of minutes)
echo Press Ctrl+C to stop.
echo.

start "" /b cmd /c npm run dev
call npm run prod

endlocal
