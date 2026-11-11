@echo off
setlocal
set "APP_DIR=%~dp0data"

if not exist "%APP_DIR%\node_modules" (
  echo node_modules not found, installing dependencies...
  pushd "%APP_DIR%"
  call npm install
  popd
)

if not exist "%APP_DIR%\.env.local" (
  echo WARNING: data\.env.local is missing. Copy data\.env.example to data\.env.local and fill in your Supabase keys.
)

echo Starting dev server on http://localhost:3000 ...
start "Dev Server (3000)" /D "%APP_DIR%" cmd /k npm run dev

echo Starting production server on http://localhost:3001 (build + start) ...
start "Prod Server (3001)" /D "%APP_DIR%" cmd /k npm run prod

endlocal
