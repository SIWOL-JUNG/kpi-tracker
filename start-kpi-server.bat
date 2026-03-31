@echo off
chcp 65001 >nul
echo KPI Tracker 서버 시작 중...
cd /d C:\kpi-tracker
pm2 start "npx next start -p 3000 -H 0.0.0.0" --name kpi-tracker 2>nul || pm2 restart kpi-tracker
echo.
echo 서버가 시작되었습니다.
echo 접속: http://localhost:3000
