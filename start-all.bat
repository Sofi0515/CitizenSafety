@echo off
echo ===================================================
echo   Starting Urban Safety AI Dashboard & Backend...
echo ===================================================
start "Urban Safety ML Backend" cmd /k "cd safenet-backend && ..\venv\Scripts\python.exe app.py"
start "Urban Safety React Dashboard" cmd /k "npm run dev"
