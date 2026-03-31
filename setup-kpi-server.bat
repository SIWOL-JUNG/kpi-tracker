@echo off
chcp 65001 >nul
echo ========================================
echo   KPI Tracker 서버 최초 설정
echo   (서버 PC에서 1회만 실행)
echo ========================================
echo.

REM Node.js 확인
node -v >nul 2>&1
if errorlevel 1 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 LTS 버전을 다운로드하여 설치하세요.
    pause
    exit /b 1
)
echo [OK] Node.js 확인됨:
node -v
echo.

cd /d C:\kpi-tracker

echo [1/5] npm install 실행 중...
call npm install
echo.

echo [2/5] pm2 전역 설치 중...
call npm install -g pm2
echo.

echo [3/5] 프로덕션 빌드 중...
call npx next build
echo.

echo [4/5] pm2로 서버 시작 중...
pm2 delete kpi-tracker >nul 2>&1
pm2 start "npx next start -p 3000 -H 0.0.0.0" --name kpi-tracker
echo.

echo [5/5] pm2 설정 저장 중...
pm2 save
echo.

echo ========================================
echo   설정 완료!
echo.
echo   접속 URL: http://localhost:3000
echo   (같은 네트워크: http://서버IP:3000)
echo.
echo   서버 재시작: pm2 restart kpi-tracker
echo   서버 중지:   pm2 stop kpi-tracker
echo   로그 확인:   pm2 logs kpi-tracker
echo.
echo   부팅 시 자동 시작 등록:
echo   pm2-startup install 실행 후 안내에 따르세요.
echo ========================================
pause
