@echo off
chcp 65001 >nul
echo Instalando dependencias (precisa do Node.js)...
call npm install
echo Gerando o .exe...
call npm run build
echo.
echo Pronto! O arquivo esta na pasta dist.
pause
