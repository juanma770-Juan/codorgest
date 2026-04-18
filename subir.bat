@echo off
echo ========================================
echo   CodorGest - Subir Actualizaciones
echo ========================================
echo.

cd /d "c:\Users\Juanma PC\.antigravity\quail-manager"

set /p mensaje="Describe que cambiaste (ej: arregle botones): "

echo.
echo Preparando archivos...
git add .

echo Guardando cambios...
git commit -m "%mensaje%"

echo Subiendo a GitHub...
git push origin main

echo.
echo ========================================
echo   LISTO! Vercel se actualizara solo
echo   en 2-3 minutos automaticamente.
echo ========================================
pause
