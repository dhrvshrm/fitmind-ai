# Opens the backend and frontend dev servers in separate PowerShell windows.
$root = $PSScriptRoot

Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; npm run dev:be"
Start-Process powershell -ArgumentList '-NoExit', '-Command', "Set-Location '$root'; npm run dev:fe"
