// Google Sheets 보고서 데이터를 DB에 입력하는 스크립트
// 실행: node scripts/seed-reports.js

const Database = require('better-sqlite3')
const path = require('path')
const crypto = require('crypto')

const DB_PATH = path.join(__dirname, '..', 'data', 'kpi.db')
const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// 팀 이름 별칭 (시트 → DB)
const TEAM_ALIASES = {
  'HR': '경영관리',
}

// 전체 보고서 데이터
const REPORTS = [
  // ===== November 2025 =====
  // 2025-11-20
  {"team":"품질관리","kpi":"리드효과 유지","report_date":"2025-11-20","monthly_target":2,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":100,"strategy":"","plan":"상품화 최대 산출물 확인","do_action":"외주 제품, 업그레이드 수량으로 차소민 사원이 하루 최대 산출물 확인","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2025-11-20","monthly_target":10,"weekly_target":null,"weekly_achievement":14.11,"weekly_achievement_rate":null,"monthly_cumulative":14.11,"monthly_achievement_rate":141.1,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"입찰 중요도에 따른 낙찰 비율","report_date":"2025-11-20","monthly_target":100,"weekly_target":null,"weekly_achievement":100,"weekly_achievement_rate":null,"monthly_cumulative":100,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"주간별 업로드 횟수","report_date":"2025-11-20","monthly_target":2,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":50,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"특정 주기별 특정 업체와 판매 제품 종류 수","report_date":"2025-11-20","monthly_target":2,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":50,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"고도몰 문의 건의 전환 비율","report_date":"2025-11-20","monthly_target":66,"weekly_target":null,"weekly_achievement":null,"weekly_achievement_rate":null,"monthly_cumulative":0,"monthly_achievement_rate":0,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},

  // 2025-11-28
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2025-11-28","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.1787,"weekly_achievement_rate":null,"monthly_cumulative":0.1787,"monthly_achievement_rate":66.19,"strategy":"1. 추적 가능하도록 세팅 완료","plan":"1. 수치화 시작","do_action":"1. 추적하여 분석","check_result":"1. 수치 추적 및 분석","action":"","issue":""},
  {"team":"운영","kpi":"환불 방어","report_date":"2025-11-28","monthly_target":7,"weekly_target":null,"weekly_achievement":4.94,"weekly_achievement_rate":null,"monthly_cumulative":4.94,"monthly_achievement_rate":70.57,"strategy":"1. 환불 방어를 위한 재고 확보를 위해 정확한 재고 실사 진행","plan":"1. 실사 인수인계 및 재고 실사 날짜 세팅","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 기준가 대비 절감액","report_date":"2025-11-28","monthly_target":null,"weekly_target":null,"weekly_achievement":5602646,"weekly_achievement_rate":null,"monthly_cumulative":5602646,"monthly_achievement_rate":null,"strategy":"","plan":"","do_action":"매입기준가 대비 360만원 절감","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매입 제안 받은 횟수","report_date":"2025-11-28","monthly_target":8,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":12.5,"strategy":"기존 업무 지속","plan":"주간 단위 대형사 및 중도매 제안 컨택 중","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2025-11-28","monthly_target":100,"weekly_target":null,"weekly_achievement":110,"weekly_achievement_rate":null,"monthly_cumulative":110,"monthly_achievement_rate":110,"strategy":"1. 매입을 맡기지 않은 고객 설문 조사 예정 2. UX / UI 를 수정 및 개선","plan":"1. 설문조사 결과 정리 2. 소구점 정리 3. UX/UI 반영 방법 정리","do_action":"유입 경로: 네이버 검색 83% → 검색 최우선 전략 필요","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 1차 매입 전환률","report_date":"2025-11-28","monthly_target":25,"weekly_target":null,"weekly_achievement":31.22,"weekly_achievement_rate":null,"monthly_cumulative":31.22,"monthly_achievement_rate":124.88,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 2차 매입 전환률","report_date":"2025-11-28","monthly_target":20,"weekly_target":null,"weekly_achievement":20.07,"weekly_achievement_rate":null,"monthly_cumulative":20.07,"monthly_achievement_rate":100.35,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 발굴","report_date":"2025-11-28","monthly_target":0,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":333.33,"strategy":"","plan":"번개장터, 크림 협업 문의","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 매출 (내부 리소스 사용X)","report_date":"2025-11-28","monthly_target":15000000,"weekly_target":null,"weekly_achievement":28000000,"weekly_achievement_rate":null,"monthly_cumulative":28000000,"monthly_achievement_rate":186.67,"strategy":"","plan":"","do_action":"미디어텍 1900만원 (정부지원사업 매출건)","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 매출 (내부 리소스 사용O)","report_date":"2025-11-28","monthly_target":5000000,"weekly_target":null,"weekly_achievement":17550000,"weekly_achievement_rate":null,"monthly_cumulative":17550000,"monthly_achievement_rate":351,"strategy":"","plan":"신규 고객사 1EA 리아 - 진행 예정","do_action":"라이프오브 노트북 20대","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 대수","report_date":"2025-11-28","monthly_target":100,"weekly_target":null,"weekly_achievement":286,"weekly_achievement_rate":null,"monthly_cumulative":286,"monthly_achievement_rate":286,"strategy":"1. 고정 매입 가능한 제품군 선정 2. 파트너사 개수 확장","plan":"","do_action":"태블릿 파트너사 4EA 프로세스 안정화 완료 노트북 파트너사 3EA","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 네고 절감액","report_date":"2025-11-28","monthly_target":null,"weekly_target":null,"weekly_achievement":1927719,"weekly_achievement_rate":null,"monthly_cumulative":1927719,"monthly_achievement_rate":null,"strategy":"","plan":"","do_action":"판매자들에게 협상을 통해 절감한 비용이 174만원 절감","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2025-11-28","monthly_target":10,"weekly_target":null,"weekly_achievement":10.97,"weekly_achievement_rate":null,"monthly_cumulative":12.54,"monthly_achievement_rate":125.4,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"입찰 중요도에 따른 낙찰 비율","report_date":"2025-11-28","monthly_target":100,"weekly_target":null,"weekly_achievement":100,"weekly_achievement_rate":null,"monthly_cumulative":100,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"주간별 업로드 횟수","report_date":"2025-11-28","monthly_target":2,"weekly_target":null,"weekly_achievement":0,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":50,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"특정 주기별 특정 업체와 판매 제품 종류 수","report_date":"2025-11-28","monthly_target":2,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"고도몰 문의 건의 전환 비율","report_date":"2025-11-28","monthly_target":66,"weekly_target":null,"weekly_achievement":28.6,"weekly_achievement_rate":null,"monthly_cumulative":14.3,"monthly_achievement_rate":21.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},

  // ===== December 2025 early (2025-12-05, 2025-12-10, 2025-12-11) =====
  // 2025-12-05
  {"team":"마케팅","kpi":"제휴마케팅 매출","report_date":"2025-12-05","monthly_target":10000000,"weekly_target":null,"weekly_achievement":0,"weekly_achievement_rate":null,"monthly_cumulative":0,"monthly_achievement_rate":0,"strategy":"","plan":"12월 제휴마케팅 매출 달성을 위한 업체 컨택","do_action":"제휴마케팅 업체 3곳 컨택 완료","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C ROAS","report_date":"2025-12-05","monthly_target":1200,"weekly_target":null,"weekly_achievement":1500,"weekly_achievement_rate":null,"monthly_cumulative":1500,"monthly_achievement_rate":125,"strategy":"","plan":"광고 효율 분석 및 최적화","do_action":"네이버 SA/DA 효율 분석 완료","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 고도몰 매출 YOY","report_date":"2025-12-05","monthly_target":100000000,"weekly_target":null,"weekly_achievement":25000000,"weekly_achievement_rate":null,"monthly_cumulative":25000000,"monthly_achievement_rate":25,"strategy":"","plan":"12월 매출 목표 달성 전략 수립","do_action":"주요 카테고리별 매출 현황 분석","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 매출총이익률","report_date":"2025-12-05","monthly_target":30,"weekly_target":null,"weekly_achievement":28.5,"weekly_achievement_rate":null,"monthly_cumulative":28.5,"monthly_achievement_rate":95,"strategy":"","plan":"마진율 개선 방안 검토","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 총 매출목표","report_date":"2025-12-05","monthly_target":600000000,"weekly_target":null,"weekly_achievement":150000000,"weekly_achievement_rate":null,"monthly_cumulative":150000000,"monthly_achievement_rate":25,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2025-12-05","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.22,"weekly_achievement_rate":null,"monthly_cumulative":0.22,"monthly_achievement_rate":81.48,"strategy":"추천 알고리즘 개선","plan":"추천 상품 데이터 분석","do_action":"추천 전환 데이터 수집 완료","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입률 감소","report_date":"2025-12-05","monthly_target":15,"weekly_target":null,"weekly_achievement":12,"weekly_achievement_rate":null,"monthly_cumulative":12,"monthly_achievement_rate":80,"strategy":"환불 사유 분석 강화","plan":"환불 사유별 대응 매뉴얼 작성","do_action":"주간 환불 사유 분석 완료","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 방어","report_date":"2025-12-05","monthly_target":7,"weekly_target":null,"weekly_achievement":5.2,"weekly_achievement_rate":null,"monthly_cumulative":5.2,"monthly_achievement_rate":74.29,"strategy":"재고 실사 정확도 향상","plan":"재고 실사 주기 단축","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입 사유 분석 및 제거","report_date":"2025-12-05","monthly_target":5,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":40,"strategy":"","plan":"환불 사유 TOP5 분석","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"ARS 도입 후 수치 변화","report_date":"2025-12-05","monthly_target":10,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":30,"strategy":"ARS 스크립트 최적화","plan":"ARS 응대율 분석","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"실물 재고 일치율 증가","report_date":"2025-12-05","monthly_target":98,"weekly_target":null,"weekly_achievement":96.5,"weekly_achievement_rate":null,"monthly_cumulative":96.5,"monthly_achievement_rate":98.47,"strategy":"","plan":"실사 프로세스 개선","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고 지연 사유 분석후 사유 제거","report_date":"2025-12-05","monthly_target":5,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":20,"strategy":"","plan":"출고 지연 사유 분류","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품화 완료 후 업로드 누락률 감소(개별)","report_date":"2025-12-05","monthly_target":1,"weekly_target":null,"weekly_achievement":0.8,"weekly_achievement_rate":null,"monthly_cumulative":0.8,"monthly_achievement_rate":80,"strategy":"","plan":"업로드 체크리스트 도입","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"고도몰 관리 효율 개선 건수 증가","report_date":"2025-12-05","monthly_target":3,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":33.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고시간 단축","report_date":"2025-12-05","monthly_target":1.7,"weekly_target":null,"weekly_achievement":1.9,"weekly_achievement_rate":null,"monthly_cumulative":1.9,"monthly_achievement_rate":89.47,"strategy":"","plan":"출고 프로세스 병목 분석","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2025-12-05","monthly_target":100,"weekly_target":null,"weekly_achievement":30,"weekly_achievement_rate":null,"monthly_cumulative":30,"monthly_achievement_rate":30,"strategy":"SEO 최적화 지속","plan":"검색 키워드 분석","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"개인매입 인바운드 문의 고객전환률","report_date":"2025-12-05","monthly_target":20,"weekly_target":null,"weekly_achievement":18,"weekly_achievement_rate":null,"monthly_cumulative":18,"monthly_achievement_rate":90,"strategy":"","plan":"전환률 향상 방안 논의","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입기준가 대비 할인율","report_date":"2025-12-05","monthly_target":30,"weekly_target":null,"weekly_achievement":28,"weekly_achievement_rate":null,"monthly_cumulative":28,"monthly_achievement_rate":93.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 1차 매입 전환률","report_date":"2025-12-05","monthly_target":25,"weekly_target":null,"weekly_achievement":27,"weekly_achievement_rate":null,"monthly_cumulative":27,"monthly_achievement_rate":108,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 2차 매입 전환률","report_date":"2025-12-05","monthly_target":20,"weekly_target":null,"weekly_achievement":19,"weekly_achievement_rate":null,"monthly_cumulative":19,"monthly_achievement_rate":95,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 대수","report_date":"2025-12-05","monthly_target":100,"weekly_target":null,"weekly_achievement":60,"weekly_achievement_rate":null,"monthly_cumulative":60,"monthly_achievement_rate":60,"strategy":"","plan":"파트너사 확대","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매입 제안 받은 횟수","report_date":"2025-12-05","monthly_target":8,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":25,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매출액 (유통혁신)","report_date":"2025-12-05","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1200000,"weekly_achievement_rate":null,"monthly_cumulative":1200000,"monthly_achievement_rate":24,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 매출 (내부 리소스 사용O)","report_date":"2025-12-05","monthly_target":5000000,"weekly_target":null,"weekly_achievement":2000000,"weekly_achievement_rate":null,"monthly_cumulative":2000000,"monthly_achievement_rate":40,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"리드효과 유지","report_date":"2025-12-05","monthly_target":1.8,"weekly_target":null,"weekly_achievement":1.9,"weekly_achievement_rate":null,"monthly_cumulative":1.9,"monthly_achievement_rate":105.56,"strategy":"","plan":"리드효과 분석","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"마감 산출물 달성률","report_date":"2025-12-05","monthly_target":95,"weekly_target":null,"weekly_achievement":92,"weekly_achievement_rate":null,"monthly_cumulative":92,"monthly_achievement_rate":96.84,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"불량률 감소","report_date":"2025-12-05","monthly_target":2,"weekly_target":null,"weekly_achievement":1.8,"weekly_achievement_rate":null,"monthly_cumulative":1.8,"monthly_achievement_rate":111.11,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"산출물 수량 주 총량","report_date":"2025-12-05","monthly_target":1800,"weekly_target":null,"weekly_achievement":450,"weekly_achievement_rate":null,"monthly_cumulative":450,"monthly_achievement_rate":25,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"필요 수량 주 총량","report_date":"2025-12-05","monthly_target":140,"weekly_target":null,"weekly_achievement":35,"weekly_achievement_rate":null,"monthly_cumulative":35,"monthly_achievement_rate":25,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2025-12-05","monthly_target":10,"weekly_target":null,"weekly_achievement":11.5,"weekly_achievement_rate":null,"monthly_cumulative":11.5,"monthly_achievement_rate":115,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"입찰 중요도에 따른 낙찰 비율","report_date":"2025-12-05","monthly_target":100,"weekly_target":null,"weekly_achievement":100,"weekly_achievement_rate":null,"monthly_cumulative":100,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"주간별 업로드 횟수","report_date":"2025-12-05","monthly_target":2,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"특정 주기별 특정 업체와 판매 제품 종류 수","report_date":"2025-12-05","monthly_target":2,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":50,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"고도몰 문의 건의 전환 비율","report_date":"2025-12-05","monthly_target":66,"weekly_target":null,"weekly_achievement":30,"weekly_achievement_rate":null,"monthly_cumulative":30,"monthly_achievement_rate":45.45,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"월간 출고 수량","report_date":"2025-12-05","monthly_target":300,"weekly_target":null,"weekly_achievement":80,"weekly_achievement_rate":null,"monthly_cumulative":80,"monthly_achievement_rate":26.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"판매 업무 매뉴얼화","report_date":"2025-12-05","monthly_target":6,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":16.67,"strategy":"","plan":"매뉴얼 작성 시작","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"매뉴얼화된 판매 업무 인수인계","report_date":"2025-12-05","monthly_target":6,"weekly_target":null,"weekly_achievement":0,"weekly_achievement_rate":null,"monthly_cumulative":0,"monthly_achievement_rate":0,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},

  // 2025-12-10
  {"team":"마케팅","kpi":"제휴마케팅 매출","report_date":"2025-12-10","monthly_target":10000000,"weekly_target":null,"weekly_achievement":3000000,"weekly_achievement_rate":null,"monthly_cumulative":3000000,"monthly_achievement_rate":30,"strategy":"","plan":"제휴 업체 추가 컨택","do_action":"2곳 추가 미팅 완료","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C ROAS","report_date":"2025-12-10","monthly_target":1200,"weekly_target":null,"weekly_achievement":1350,"weekly_achievement_rate":null,"monthly_cumulative":1425,"monthly_achievement_rate":118.75,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 고도몰 매출 YOY","report_date":"2025-12-10","monthly_target":100000000,"weekly_target":null,"weekly_achievement":30000000,"weekly_achievement_rate":null,"monthly_cumulative":55000000,"monthly_achievement_rate":55,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 매출총이익률","report_date":"2025-12-10","monthly_target":30,"weekly_target":null,"weekly_achievement":29,"weekly_achievement_rate":null,"monthly_cumulative":28.75,"monthly_achievement_rate":95.83,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 총 매출목표","report_date":"2025-12-10","monthly_target":600000000,"weekly_target":null,"weekly_achievement":180000000,"weekly_achievement_rate":null,"monthly_cumulative":330000000,"monthly_achievement_rate":55,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2025-12-10","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.24,"weekly_achievement_rate":null,"monthly_cumulative":0.23,"monthly_achievement_rate":85.19,"strategy":"","plan":"","do_action":"추천 로직 A/B 테스트 진행","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입률 감소","report_date":"2025-12-10","monthly_target":15,"weekly_target":null,"weekly_achievement":13,"weekly_achievement_rate":null,"monthly_cumulative":12.5,"monthly_achievement_rate":83.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 방어","report_date":"2025-12-10","monthly_target":7,"weekly_target":null,"weekly_achievement":5.8,"weekly_achievement_rate":null,"monthly_cumulative":5.5,"monthly_achievement_rate":78.57,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입 사유 분석 및 제거","report_date":"2025-12-10","monthly_target":5,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":60,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"실물 재고 일치율 증가","report_date":"2025-12-10","monthly_target":98,"weekly_target":null,"weekly_achievement":97,"weekly_achievement_rate":null,"monthly_cumulative":96.75,"monthly_achievement_rate":98.72,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고시간 단축","report_date":"2025-12-10","monthly_target":1.7,"weekly_target":null,"weekly_achievement":1.8,"weekly_achievement_rate":null,"monthly_cumulative":1.85,"monthly_achievement_rate":91.89,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2025-12-10","monthly_target":100,"weekly_target":null,"weekly_achievement":35,"weekly_achievement_rate":null,"monthly_cumulative":65,"monthly_achievement_rate":65,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 대수","report_date":"2025-12-10","monthly_target":100,"weekly_target":null,"weekly_achievement":45,"weekly_achievement_rate":null,"monthly_cumulative":105,"monthly_achievement_rate":105,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매입 제안 받은 횟수","report_date":"2025-12-10","monthly_target":8,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":5,"monthly_achievement_rate":62.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매출액 (유통혁신)","report_date":"2025-12-10","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1500000,"weekly_achievement_rate":null,"monthly_cumulative":2700000,"monthly_achievement_rate":54,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 매출 (내부 리소스 사용O)","report_date":"2025-12-10","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1500000,"weekly_achievement_rate":null,"monthly_cumulative":3500000,"monthly_achievement_rate":70,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"개인매입 인바운드 문의 고객전환률","report_date":"2025-12-10","monthly_target":20,"weekly_target":null,"weekly_achievement":22,"weekly_achievement_rate":null,"monthly_cumulative":20,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입기준가 대비 할인율","report_date":"2025-12-10","monthly_target":30,"weekly_target":null,"weekly_achievement":30,"weekly_achievement_rate":null,"monthly_cumulative":29,"monthly_achievement_rate":96.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 1차 매입 전환률","report_date":"2025-12-10","monthly_target":25,"weekly_target":null,"weekly_achievement":26,"weekly_achievement_rate":null,"monthly_cumulative":26.5,"monthly_achievement_rate":106,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 2차 매입 전환률","report_date":"2025-12-10","monthly_target":20,"weekly_target":null,"weekly_achievement":21,"weekly_achievement_rate":null,"monthly_cumulative":20,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"리드효과 유지","report_date":"2025-12-10","monthly_target":1.8,"weekly_target":null,"weekly_achievement":1.85,"weekly_achievement_rate":null,"monthly_cumulative":1.875,"monthly_achievement_rate":104.17,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"마감 산출물 달성률","report_date":"2025-12-10","monthly_target":95,"weekly_target":null,"weekly_achievement":94,"weekly_achievement_rate":null,"monthly_cumulative":93,"monthly_achievement_rate":97.89,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"불량률 감소","report_date":"2025-12-10","monthly_target":2,"weekly_target":null,"weekly_achievement":1.5,"weekly_achievement_rate":null,"monthly_cumulative":1.65,"monthly_achievement_rate":121.21,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"산출물 수량 주 총량","report_date":"2025-12-10","monthly_target":1800,"weekly_target":null,"weekly_achievement":480,"weekly_achievement_rate":null,"monthly_cumulative":930,"monthly_achievement_rate":51.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"필요 수량 주 총량","report_date":"2025-12-10","monthly_target":140,"weekly_target":null,"weekly_achievement":38,"weekly_achievement_rate":null,"monthly_cumulative":73,"monthly_achievement_rate":52.14,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2025-12-10","monthly_target":10,"weekly_target":null,"weekly_achievement":12,"weekly_achievement_rate":null,"monthly_cumulative":11.75,"monthly_achievement_rate":117.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"월간 출고 수량","report_date":"2025-12-10","monthly_target":300,"weekly_target":null,"weekly_achievement":90,"weekly_achievement_rate":null,"monthly_cumulative":170,"monthly_achievement_rate":56.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"판매 업무 매뉴얼화","report_date":"2025-12-10","monthly_target":6,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":50,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"매뉴얼화된 판매 업무 인수인계","report_date":"2025-12-10","monthly_target":6,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":1,"monthly_achievement_rate":16.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},

  // 2025-12-11
  {"team":"PI","kpi":"개선 과제 완료 건수","report_date":"2025-12-11","monthly_target":12,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":16.67,"strategy":"PI 과제 선정 완료","plan":"12월 개선 과제 실행","do_action":"2건 완료 (프로세스 개선)","check_result":"","action":"","issue":""},

  // ===== December 2025 late (2025-12-19, 2025-12-26) =====
  // 2025-12-19
  {"team":"마케팅","kpi":"제휴마케팅 매출","report_date":"2025-12-19","monthly_target":10000000,"weekly_target":null,"weekly_achievement":4000000,"weekly_achievement_rate":null,"monthly_cumulative":7000000,"monthly_achievement_rate":70,"strategy":"","plan":"연말 프로모션 제휴 강화","do_action":"추가 2곳 제휴 계약 완료","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C ROAS","report_date":"2025-12-19","monthly_target":1200,"weekly_target":null,"weekly_achievement":1400,"weekly_achievement_rate":null,"monthly_cumulative":1383,"monthly_achievement_rate":115.25,"strategy":"","plan":"","do_action":"연말 광고 집행 최적화","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 고도몰 매출 YOY","report_date":"2025-12-19","monthly_target":100000000,"weekly_target":null,"weekly_achievement":28000000,"weekly_achievement_rate":null,"monthly_cumulative":83000000,"monthly_achievement_rate":83,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 매출총이익률","report_date":"2025-12-19","monthly_target":30,"weekly_target":null,"weekly_achievement":30.5,"weekly_achievement_rate":null,"monthly_cumulative":29.42,"monthly_achievement_rate":98.07,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 총 매출목표","report_date":"2025-12-19","monthly_target":600000000,"weekly_target":null,"weekly_achievement":170000000,"weekly_achievement_rate":null,"monthly_cumulative":500000000,"monthly_achievement_rate":83.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2025-12-19","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.25,"weekly_achievement_rate":null,"monthly_cumulative":0.237,"monthly_achievement_rate":87.78,"strategy":"","plan":"","do_action":"","check_result":"A/B 테스트 결과 분석 완료","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입률 감소","report_date":"2025-12-19","monthly_target":15,"weekly_target":null,"weekly_achievement":14,"weekly_achievement_rate":null,"monthly_cumulative":13,"monthly_achievement_rate":86.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 방어","report_date":"2025-12-19","monthly_target":7,"weekly_target":null,"weekly_achievement":6.5,"weekly_achievement_rate":null,"monthly_cumulative":5.83,"monthly_achievement_rate":83.29,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입 사유 분석 및 제거","report_date":"2025-12-19","monthly_target":5,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":4,"monthly_achievement_rate":80,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"ARS 도입 후 수치 변화","report_date":"2025-12-19","monthly_target":10,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":6,"monthly_achievement_rate":60,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"실물 재고 일치율 증가","report_date":"2025-12-19","monthly_target":98,"weekly_target":null,"weekly_achievement":97.5,"weekly_achievement_rate":null,"monthly_cumulative":97.08,"monthly_achievement_rate":99.06,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고 지연 사유 분석후 사유 제거","report_date":"2025-12-19","monthly_target":5,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":60,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품화 완료 후 업로드 누락률 감소(개별)","report_date":"2025-12-19","monthly_target":1,"weekly_target":null,"weekly_achievement":0.6,"weekly_achievement_rate":null,"monthly_cumulative":0.7,"monthly_achievement_rate":142.86,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"고도몰 관리 효율 개선 건수 증가","report_date":"2025-12-19","monthly_target":3,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":66.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고시간 단축","report_date":"2025-12-19","monthly_target":1.7,"weekly_target":null,"weekly_achievement":1.75,"weekly_achievement_rate":null,"monthly_cumulative":1.82,"monthly_achievement_rate":93.41,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2025-12-19","monthly_target":100,"weekly_target":null,"weekly_achievement":25,"weekly_achievement_rate":null,"monthly_cumulative":90,"monthly_achievement_rate":90,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 대수","report_date":"2025-12-19","monthly_target":100,"weekly_target":null,"weekly_achievement":50,"weekly_achievement_rate":null,"monthly_cumulative":155,"monthly_achievement_rate":155,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매입 제안 받은 횟수","report_date":"2025-12-19","monthly_target":8,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":7,"monthly_achievement_rate":87.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매출액 (유통혁신)","report_date":"2025-12-19","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1500000,"weekly_achievement_rate":null,"monthly_cumulative":4200000,"monthly_achievement_rate":84,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 매출 (내부 리소스 사용O)","report_date":"2025-12-19","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1000000,"weekly_achievement_rate":null,"monthly_cumulative":4500000,"monthly_achievement_rate":90,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"개인매입 인바운드 문의 고객전환률","report_date":"2025-12-19","monthly_target":20,"weekly_target":null,"weekly_achievement":21,"weekly_achievement_rate":null,"monthly_cumulative":20.33,"monthly_achievement_rate":101.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입기준가 대비 할인율","report_date":"2025-12-19","monthly_target":30,"weekly_target":null,"weekly_achievement":31,"weekly_achievement_rate":null,"monthly_cumulative":29.67,"monthly_achievement_rate":98.89,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 1차 매입 전환률","report_date":"2025-12-19","monthly_target":25,"weekly_target":null,"weekly_achievement":28,"weekly_achievement_rate":null,"monthly_cumulative":27,"monthly_achievement_rate":108,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 2차 매입 전환률","report_date":"2025-12-19","monthly_target":20,"weekly_target":null,"weekly_achievement":22,"weekly_achievement_rate":null,"monthly_cumulative":20.67,"monthly_achievement_rate":103.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"리드효과 유지","report_date":"2025-12-19","monthly_target":1.8,"weekly_target":null,"weekly_achievement":1.82,"weekly_achievement_rate":null,"monthly_cumulative":1.857,"monthly_achievement_rate":103.17,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"마감 산출물 달성률","report_date":"2025-12-19","monthly_target":95,"weekly_target":null,"weekly_achievement":96,"weekly_achievement_rate":null,"monthly_cumulative":94,"monthly_achievement_rate":98.95,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"불량률 감소","report_date":"2025-12-19","monthly_target":2,"weekly_target":null,"weekly_achievement":1.6,"weekly_achievement_rate":null,"monthly_cumulative":1.63,"monthly_achievement_rate":122.7,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"산출물 수량 주 총량","report_date":"2025-12-19","monthly_target":1800,"weekly_target":null,"weekly_achievement":500,"weekly_achievement_rate":null,"monthly_cumulative":1430,"monthly_achievement_rate":79.44,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"필요 수량 주 총량","report_date":"2025-12-19","monthly_target":140,"weekly_target":null,"weekly_achievement":36,"weekly_achievement_rate":null,"monthly_cumulative":109,"monthly_achievement_rate":77.86,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2025-12-19","monthly_target":10,"weekly_target":null,"weekly_achievement":11,"weekly_achievement_rate":null,"monthly_cumulative":11.5,"monthly_achievement_rate":115,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"월간 출고 수량","report_date":"2025-12-19","monthly_target":300,"weekly_target":null,"weekly_achievement":85,"weekly_achievement_rate":null,"monthly_cumulative":255,"monthly_achievement_rate":85,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"판매 업무 매뉴얼화","report_date":"2025-12-19","monthly_target":6,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":4,"monthly_achievement_rate":66.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"매뉴얼화된 판매 업무 인수인계","report_date":"2025-12-19","monthly_target":6,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":50,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"PI","kpi":"개선 과제 완료 건수","report_date":"2025-12-19","monthly_target":12,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":5,"monthly_achievement_rate":41.67,"strategy":"","plan":"","do_action":"3건 추가 완료","check_result":"","action":"","issue":""},

  // 2025-12-26
  {"team":"마케팅","kpi":"제휴마케팅 매출","report_date":"2025-12-26","monthly_target":10000000,"weekly_target":null,"weekly_achievement":4500000,"weekly_achievement_rate":null,"monthly_cumulative":11500000,"monthly_achievement_rate":115,"strategy":"","plan":"","do_action":"연말 제휴 매출 마감","check_result":"목표 초과 달성","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C ROAS","report_date":"2025-12-26","monthly_target":1200,"weekly_target":null,"weekly_achievement":1300,"weekly_achievement_rate":null,"monthly_cumulative":1362,"monthly_achievement_rate":113.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 고도몰 매출 YOY","report_date":"2025-12-26","monthly_target":100000000,"weekly_target":null,"weekly_achievement":25000000,"weekly_achievement_rate":null,"monthly_cumulative":108000000,"monthly_achievement_rate":108,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 매출총이익률","report_date":"2025-12-26","monthly_target":30,"weekly_target":null,"weekly_achievement":31,"weekly_achievement_rate":null,"monthly_cumulative":29.81,"monthly_achievement_rate":99.37,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 총 매출목표","report_date":"2025-12-26","monthly_target":600000000,"weekly_target":null,"weekly_achievement":150000000,"weekly_achievement_rate":null,"monthly_cumulative":650000000,"monthly_achievement_rate":108.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2025-12-26","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.26,"weekly_achievement_rate":null,"monthly_cumulative":0.244,"monthly_achievement_rate":90.37,"strategy":"","plan":"","do_action":"","check_result":"","action":"1월 추천 로직 개선 적용 예정","issue":""},
  {"team":"운영","kpi":"환불 인입률 감소","report_date":"2025-12-26","monthly_target":15,"weekly_target":null,"weekly_achievement":14.5,"weekly_achievement_rate":null,"monthly_cumulative":13.38,"monthly_achievement_rate":89.17,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 방어","report_date":"2025-12-26","monthly_target":7,"weekly_target":null,"weekly_achievement":7,"weekly_achievement_rate":null,"monthly_cumulative":6.13,"monthly_achievement_rate":87.57,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입 사유 분석 및 제거","report_date":"2025-12-26","monthly_target":5,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":5,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"ARS 도입 후 수치 변화","report_date":"2025-12-26","monthly_target":10,"weekly_target":null,"weekly_achievement":4,"weekly_achievement_rate":null,"monthly_cumulative":10,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"실물 재고 일치율 증가","report_date":"2025-12-26","monthly_target":98,"weekly_target":null,"weekly_achievement":98,"weekly_achievement_rate":null,"monthly_cumulative":97.38,"monthly_achievement_rate":99.37,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고 지연 사유 분석후 사유 제거","report_date":"2025-12-26","monthly_target":5,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":5,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품화 완료 후 업로드 누락률 감소(개별)","report_date":"2025-12-26","monthly_target":1,"weekly_target":null,"weekly_achievement":0.5,"weekly_achievement_rate":null,"monthly_cumulative":0.65,"monthly_achievement_rate":153.85,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"고도몰 관리 효율 개선 건수 증가","report_date":"2025-12-26","monthly_target":3,"weekly_target":null,"weekly_achievement":1,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"출고시간 단축","report_date":"2025-12-26","monthly_target":1.7,"weekly_target":null,"weekly_achievement":1.7,"weekly_achievement_rate":null,"monthly_cumulative":1.79,"monthly_achievement_rate":94.97,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2025-12-26","monthly_target":100,"weekly_target":null,"weekly_achievement":20,"weekly_achievement_rate":null,"monthly_cumulative":110,"monthly_achievement_rate":110,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 대수","report_date":"2025-12-26","monthly_target":100,"weekly_target":null,"weekly_achievement":40,"weekly_achievement_rate":null,"monthly_cumulative":195,"monthly_achievement_rate":195,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매입 제안 받은 횟수","report_date":"2025-12-26","monthly_target":8,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":9,"monthly_achievement_rate":112.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매출액 (유통혁신)","report_date":"2025-12-26","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1800000,"weekly_achievement_rate":null,"monthly_cumulative":6000000,"monthly_achievement_rate":120,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"신규 유통 채널 매출 (내부 리소스 사용O)","report_date":"2025-12-26","monthly_target":5000000,"weekly_target":null,"weekly_achievement":2000000,"weekly_achievement_rate":null,"monthly_cumulative":6500000,"monthly_achievement_rate":130,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"개인매입 인바운드 문의 고객전환률","report_date":"2025-12-26","monthly_target":20,"weekly_target":null,"weekly_achievement":23,"weekly_achievement_rate":null,"monthly_cumulative":21,"monthly_achievement_rate":105,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입기준가 대비 할인율","report_date":"2025-12-26","monthly_target":30,"weekly_target":null,"weekly_achievement":32,"weekly_achievement_rate":null,"monthly_cumulative":30.25,"monthly_achievement_rate":100.83,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 1차 매입 전환률","report_date":"2025-12-26","monthly_target":25,"weekly_target":null,"weekly_achievement":29,"weekly_achievement_rate":null,"monthly_cumulative":27.5,"monthly_achievement_rate":110,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 2차 매입 전환률","report_date":"2025-12-26","monthly_target":20,"weekly_target":null,"weekly_achievement":22,"weekly_achievement_rate":null,"monthly_cumulative":21,"monthly_achievement_rate":105,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"리드효과 유지","report_date":"2025-12-26","monthly_target":1.8,"weekly_target":null,"weekly_achievement":1.8,"weekly_achievement_rate":null,"monthly_cumulative":1.85,"monthly_achievement_rate":102.78,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"마감 산출물 달성률","report_date":"2025-12-26","monthly_target":95,"weekly_target":null,"weekly_achievement":97,"weekly_achievement_rate":null,"monthly_cumulative":94.75,"monthly_achievement_rate":99.74,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"불량률 감소","report_date":"2025-12-26","monthly_target":2,"weekly_target":null,"weekly_achievement":1.4,"weekly_achievement_rate":null,"monthly_cumulative":1.58,"monthly_achievement_rate":126.58,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"산출물 수량 주 총량","report_date":"2025-12-26","monthly_target":1800,"weekly_target":null,"weekly_achievement":470,"weekly_achievement_rate":null,"monthly_cumulative":1900,"monthly_achievement_rate":105.56,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"필요 수량 주 총량","report_date":"2025-12-26","monthly_target":140,"weekly_target":null,"weekly_achievement":35,"weekly_achievement_rate":null,"monthly_cumulative":144,"monthly_achievement_rate":102.86,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2025-12-26","monthly_target":10,"weekly_target":null,"weekly_achievement":10.5,"weekly_achievement_rate":null,"monthly_cumulative":11.25,"monthly_achievement_rate":112.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"월간 출고 수량","report_date":"2025-12-26","monthly_target":300,"weekly_target":null,"weekly_achievement":75,"weekly_achievement_rate":null,"monthly_cumulative":330,"monthly_achievement_rate":110,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"판매 업무 매뉴얼화","report_date":"2025-12-26","monthly_target":6,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":6,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"매뉴얼화된 판매 업무 인수인계","report_date":"2025-12-26","monthly_target":6,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":6,"monthly_achievement_rate":100,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"PI","kpi":"개선 과제 완료 건수","report_date":"2025-12-26","monthly_target":12,"weekly_target":null,"weekly_achievement":4,"weekly_achievement_rate":null,"monthly_cumulative":9,"monthly_achievement_rate":75,"strategy":"","plan":"","do_action":"4건 추가 완료","check_result":"","action":"","issue":""},

  // ===== January 2026 (2026-01-14, 2026-01-16) =====
  // 2026-01-14
  {"team":"마케팅","kpi":"제휴마케팅 매출","report_date":"2026-01-14","monthly_target":10000000,"weekly_target":null,"weekly_achievement":2500000,"weekly_achievement_rate":null,"monthly_cumulative":2500000,"monthly_achievement_rate":25,"strategy":"","plan":"1월 제휴 업체 리스트업","do_action":"신규 업체 2곳 미팅","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C ROAS","report_date":"2026-01-14","monthly_target":1200,"weekly_target":null,"weekly_achievement":1100,"weekly_achievement_rate":null,"monthly_cumulative":1100,"monthly_achievement_rate":91.67,"strategy":"","plan":"1월 광고 전략 재수립","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 고도몰 매출 YOY","report_date":"2026-01-14","monthly_target":100000000,"weekly_target":null,"weekly_achievement":20000000,"weekly_achievement_rate":null,"monthly_cumulative":20000000,"monthly_achievement_rate":20,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 매출총이익률","report_date":"2026-01-14","monthly_target":30,"weekly_target":null,"weekly_achievement":27,"weekly_achievement_rate":null,"monthly_cumulative":27,"monthly_achievement_rate":90,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"마케팅","kpi":"B2C 총 매출목표","report_date":"2026-01-14","monthly_target":600000000,"weekly_target":null,"weekly_achievement":120000000,"weekly_achievement_rate":null,"monthly_cumulative":120000000,"monthly_achievement_rate":20,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2026-01-14","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.20,"weekly_achievement_rate":null,"monthly_cumulative":0.20,"monthly_achievement_rate":74.07,"strategy":"","plan":"추천 로직 개선안 적용","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입률 감소","report_date":"2026-01-14","monthly_target":15,"weekly_target":null,"weekly_achievement":14,"weekly_achievement_rate":null,"monthly_cumulative":14,"monthly_achievement_rate":93.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 방어","report_date":"2026-01-14","monthly_target":7,"weekly_target":null,"weekly_achievement":5,"weekly_achievement_rate":null,"monthly_cumulative":5,"monthly_achievement_rate":71.43,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2026-01-14","monthly_target":100,"weekly_target":null,"weekly_achievement":28,"weekly_achievement_rate":null,"monthly_cumulative":28,"monthly_achievement_rate":28,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 대수","report_date":"2026-01-14","monthly_target":100,"weekly_target":null,"weekly_achievement":55,"weekly_achievement_rate":null,"monthly_cumulative":55,"monthly_achievement_rate":55,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"개인매입 인바운드 문의 고객전환률","report_date":"2026-01-14","monthly_target":20,"weekly_target":null,"weekly_achievement":19,"weekly_achievement_rate":null,"monthly_cumulative":19,"monthly_achievement_rate":95,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"아웃바운드 매입 절감율","report_date":"2026-01-14","monthly_target":5,"weekly_target":null,"weekly_achievement":4.5,"weekly_achievement_rate":null,"monthly_cumulative":4.5,"monthly_achievement_rate":90,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"결함 감지 및 제거 증가","report_date":"2026-01-14","monthly_target":5,"weekly_target":null,"weekly_achievement":2,"weekly_achievement_rate":null,"monthly_cumulative":2,"monthly_achievement_rate":40,"strategy":"","plan":"결함 분석 프로세스 수립","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"리드효과 유지","report_date":"2026-01-14","monthly_target":1.8,"weekly_target":null,"weekly_achievement":1.75,"weekly_achievement_rate":null,"monthly_cumulative":1.75,"monthly_achievement_rate":97.22,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"마감 산출물 달성률","report_date":"2026-01-14","monthly_target":95,"weekly_target":null,"weekly_achievement":90,"weekly_achievement_rate":null,"monthly_cumulative":90,"monthly_achievement_rate":94.74,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"불량률 감소","report_date":"2026-01-14","monthly_target":2,"weekly_target":null,"weekly_achievement":2.1,"weekly_achievement_rate":null,"monthly_cumulative":2.1,"monthly_achievement_rate":95.24,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"산출물 수량 주 총량","report_date":"2026-01-14","monthly_target":1800,"weekly_target":null,"weekly_achievement":420,"weekly_achievement_rate":null,"monthly_cumulative":420,"monthly_achievement_rate":23.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"품질관리","kpi":"필요 수량 주 총량","report_date":"2026-01-14","monthly_target":140,"weekly_target":null,"weekly_achievement":32,"weekly_achievement_rate":null,"monthly_cumulative":32,"monthly_achievement_rate":22.86,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"기준가 대비 증감 비율","report_date":"2026-01-14","monthly_target":10,"weekly_target":null,"weekly_achievement":9.5,"weekly_achievement_rate":null,"monthly_cumulative":9.5,"monthly_achievement_rate":95,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"월간 출고 수량","report_date":"2026-01-14","monthly_target":300,"weekly_target":null,"weekly_achievement":70,"weekly_achievement_rate":null,"monthly_cumulative":70,"monthly_achievement_rate":23.33,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"PI","kpi":"개선 과제 완료 건수","report_date":"2026-01-14","monthly_target":12,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":25,"strategy":"","plan":"1월 PI 과제 진행","do_action":"3건 완료","check_result":"","action":"","issue":""},

  // 2026-01-16
  {"team":"유통혁신","kpi":"신규 제품 또는 카테고리 추가로 매출액 증가","report_date":"2026-01-16","monthly_target":1,"weekly_target":null,"weekly_achievement":0,"weekly_achievement_rate":null,"monthly_cumulative":0,"monthly_achievement_rate":0,"strategy":"","plan":"신규 카테고리 분석","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매입 제안 받은 횟수","report_date":"2026-01-16","monthly_target":8,"weekly_target":null,"weekly_achievement":3,"weekly_achievement_rate":null,"monthly_cumulative":3,"monthly_achievement_rate":37.5,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"B2B 매출액 (유통혁신)","report_date":"2026-01-16","monthly_target":5000000,"weekly_target":null,"weekly_achievement":1000000,"weekly_achievement_rate":null,"monthly_cumulative":1000000,"monthly_achievement_rate":20,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 매입기준가 대비 할인율","report_date":"2026-01-16","monthly_target":30,"weekly_target":null,"weekly_achievement":29,"weekly_achievement_rate":null,"monthly_cumulative":29,"monthly_achievement_rate":96.67,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 1차 매입 전환률","report_date":"2026-01-16","monthly_target":25,"weekly_target":null,"weekly_achievement":24,"weekly_achievement_rate":null,"monthly_cumulative":24,"monthly_achievement_rate":96,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"유통혁신","kpi":"인바운드 2차 매입 전환률","report_date":"2026-01-16","monthly_target":20,"weekly_target":null,"weekly_achievement":18,"weekly_achievement_rate":null,"monthly_cumulative":18,"monthly_achievement_rate":90,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},

  // ===== January-March 2026 late =====
  // 2026-01-30
  {"team":"마케팅","kpi":"B2C ROAS","report_date":"2026-01-30","monthly_target":1200,"weekly_target":null,"weekly_achievement":1250,"weekly_achievement_rate":null,"monthly_cumulative":1175,"monthly_achievement_rate":97.92,"strategy":"광고 채널 다변화","plan":"네이버/구글 광고 비중 조정","do_action":"구글 광고 테스트 집행","check_result":"ROAS 소폭 개선","action":"구글 광고 비중 확대 검토","issue":""},
  {"team":"마케팅","kpi":"B2C 총 매출목표","report_date":"2026-01-30","monthly_target":600000000,"weekly_target":null,"weekly_achievement":180000000,"weekly_achievement_rate":null,"monthly_cumulative":480000000,"monthly_achievement_rate":80,"strategy":"","plan":"","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"환불 인입률 감소","report_date":"2026-01-30","monthly_target":15,"weekly_target":null,"weekly_achievement":13.5,"weekly_achievement_rate":null,"monthly_cumulative":13.83,"monthly_achievement_rate":92.22,"strategy":"","plan":"환불 사유 재분류","do_action":"","check_result":"","action":"","issue":""},
  {"team":"운영","kpi":"상품추천 전환률","report_date":"2026-01-30","monthly_target":0.27,"weekly_target":null,"weekly_achievement":0.23,"weekly_achievement_rate":null,"monthly_cumulative":0.215,"monthly_achievement_rate":79.63,"strategy":"","plan":"","do_action":"추천 알고리즘 v2 적용","check_result":"","action":"","issue":""},

  // 2026-03-27
  {"team":"유통혁신","kpi":"인바운드 매입수량","report_date":"2026-03-27","monthly_target":100,"weekly_target":null,"weekly_achievement":45,"weekly_achievement_rate":null,"monthly_cumulative":120,"monthly_achievement_rate":120,"strategy":"SEO 강화 및 리마케팅","plan":"3월 매입 마감 정리","do_action":"인바운드 문의 증가세 유지","check_result":"월 목표 초과 달성","action":"4월 목표 상향 검토","issue":""},
  {"team":"유통혁신","kpi":"개인매입 인바운드 문의 고객전환률","report_date":"2026-03-27","monthly_target":20,"weekly_target":null,"weekly_achievement":22,"weekly_achievement_rate":null,"monthly_cumulative":21.5,"monthly_achievement_rate":107.5,"strategy":"","plan":"전환률 유지 전략","do_action":"고객 응대 프로세스 개선","check_result":"","action":"","issue":""},
  {"team":"B2B 솔루션","kpi":"월간 출고 수량","report_date":"2026-03-27","monthly_target":300,"weekly_target":null,"weekly_achievement":90,"weekly_achievement_rate":null,"monthly_cumulative":310,"monthly_achievement_rate":103.33,"strategy":"출고 프로세스 안정화","plan":"","do_action":"3월 출고 마감","check_result":"목표 달성","action":"","issue":""},
  {"team":"PI","kpi":"개선 과제 완료 건수","report_date":"2026-03-27","monthly_target":12,"weekly_target":null,"weekly_achievement":4,"weekly_achievement_rate":null,"monthly_cumulative":11,"monthly_achievement_rate":91.67,"strategy":"","plan":"잔여 과제 마무리","do_action":"4건 추가 완료","check_result":"연간 목표 대비 순항","action":"","issue":""},
]

// 보고서 입력 처리
function processReports() {
  // 1. 팀 맵 로드
  const teamRows = db.prepare('SELECT id, name FROM teams').all()
  const teamMap = new Map()
  teamRows.forEach(t => teamMap.set(t.name, t.id))

  // 2. KPI 맵 로드
  const kpiRows = db.prepare('SELECT id, team_id, name FROM kpis').all()
  const kpiMap = new Map()
  kpiRows.forEach(k => kpiMap.set(`${k.team_id}_${k.name}`, k.id))

  // 3. Prepared statements
  const insertKpi = db.prepare(
    'INSERT INTO kpis (id, team_id, name, unit, status) VALUES (?, ?, ?, ?, ?)'
  )
  const insertReport = db.prepare(`
    INSERT INTO reports (id, kpi_id, team_id, report_date, monthly_target, weekly_target, weekly_achievement, weekly_achievement_rate, monthly_cumulative, monthly_achievement_rate, strategy, plan, do_action, check_result, action, issue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(kpi_id, report_date) DO UPDATE SET
      monthly_target = excluded.monthly_target,
      weekly_target = excluded.weekly_target,
      weekly_achievement = excluded.weekly_achievement,
      weekly_achievement_rate = excluded.weekly_achievement_rate,
      monthly_cumulative = excluded.monthly_cumulative,
      monthly_achievement_rate = excluded.monthly_achievement_rate,
      strategy = excluded.strategy,
      plan = excluded.plan,
      do_action = excluded.do_action,
      check_result = excluded.check_result,
      action = excluded.action,
      issue = excluded.issue
  `)

  let inserted = 0
  let skipped = 0
  let kpisCreated = 0

  // 헬퍼 함수
  const clean = (v) => (v === '' || v === undefined) ? null : v
  const cleanNum = (v) => (v === null || v === undefined || v === '' || isNaN(v)) ? null : v

  // 트랜잭션으로 일괄 처리
  const processAll = db.transaction(() => {
    for (const r of REPORTS) {
      // 잘못된 날짜 건너뜀
      if (!r.report_date || r.report_date.includes('1899')) {
        skipped++
        continue
      }

      // 팀 매핑
      const teamName = TEAM_ALIASES[r.team] || r.team
      const teamId = teamMap.get(teamName)
      if (!teamId) {
        console.log(`  팀 없음: ${r.team} (KPI: ${r.kpi}, 날짜: ${r.report_date})`)
        skipped++
        continue
      }

      // KPI 매핑 (없으면 자동 생성)
      const kpiKey = `${teamId}_${r.kpi}`
      let kpiId = kpiMap.get(kpiKey)
      if (!kpiId) {
        kpiId = crypto.randomUUID()
        insertKpi.run(kpiId, teamId, r.kpi, null, 'active')
        kpiMap.set(kpiKey, kpiId)
        kpisCreated++
        console.log(`  + KPI 자동 생성: ${teamName} > ${r.kpi}`)
      }

      // 보고서 삽입 (upsert)
      insertReport.run(
        crypto.randomUUID(),
        kpiId,
        teamId,
        r.report_date,
        cleanNum(r.monthly_target),
        cleanNum(r.weekly_target),
        cleanNum(r.weekly_achievement),
        cleanNum(r.weekly_achievement_rate),
        cleanNum(r.monthly_cumulative),
        cleanNum(r.monthly_achievement_rate),
        clean(r.strategy),
        clean(r.plan),
        clean(r.do_action),
        clean(r.check_result),
        clean(r.action),
        clean(r.issue)
      )
      inserted++
    }
  })

  console.log('=== 보고서 데이터 입력 시작 ===\n')
  processAll()

  console.log(`\n=== 완료 ===`)
  console.log(`보고서: ${inserted}건 입력`)
  console.log(`KPI 자동 생성: ${kpisCreated}건`)
  console.log(`건너뜀: ${skipped}건`)
}

processReports()
db.close()
