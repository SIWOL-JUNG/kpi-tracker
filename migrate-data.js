const supabaseUrl = 'https://zuajvmvdnevtxfmuzkdd.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1YWp2bXZkbmV2dHhmbXV6a2RkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxNTExMiwiZXhwIjoyMDg5NDkxMTEyfQ._WGa6DB2FwaYP049PE2TuXgRO4buslsZZGLjzvoCtTE'

const headers = {
  'Content-Type': 'application/json',
  'apikey': serviceRoleKey,
  'Authorization': `Bearer ${serviceRoleKey}`
}

async function migrate() {
  console.log('마이그레이션 시작...')

  // 1. 팀 데이터 마이그레이션
  const teams = [
    { name: 'B2B 솔루션', leader: '이성희', unit: '건수' },
    { name: '유통혁신', leader: '김준헌', unit: '원' },
    { name: '품질관리', leader: '정시월', unit: '퍼센트' },
    { name: '마케팅', leader: '최수림', unit: '원' },
    { name: '운영', leader: '최예솔', unit: '시간' },
    { name: 'HR', leader: '천승민', unit: '수량' },
    { name: '회계', leader: '', unit: '개선건수' },
    { name: 'PI', leader: '', unit: '리드효과' },
  ]

  console.log('1. 팀 데이터 마이그레이션...')
  for (const team of teams) {
    const res = await fetch(`${supabaseUrl}/rest/v1/teams`, {
      method: 'POST',
      headers,
      body: JSON.stringify(team)
    })
    if (res.ok) console.log(`  ✓ ${team.name}`)
    else console.log(`  ✗ ${team.name} (${res.status})`)
  }

  // 팀 ID 가져오기
  const teamRes = await fetch(`${supabaseUrl}/rest/v1/teams?select=id,name`, { headers })
  const teamData = await teamRes.json()
  const teamMap = {}
  if (Array.isArray(teamData)) {
    teamData.forEach(t => teamMap[t.name] = t.id)
  }
  console.log('팀 ID 매핑:', teamMap)

  // 2. KPI 데이터 마이그레이션
  console.log('2. KPI 데이터 마이그레이션...')
  const kpis = [
    { team: '마케팅', name: '제휴마케팅 매출', unit: '원', monthly_target: 10000000 },
    { team: '마케팅', name: 'B2C ROAS', unit: '퍼센트', monthly_target: 1200 },
    { team: '마케팅', name: 'B2C 총 매출목표', unit: '원', monthly_target: 600000000 },
    { team: '마케팅', name: 'B2C 매출총이익률', unit: '퍼센트', monthly_target: 30 },
    { team: '운영', name: '상품추천 전환률', unit: '퍼센트', monthly_target: 27 },
    { team: '운영', name: '환불 인입률 감소', unit: '퍼센트', monthly_target: 15 },
    { team: '운영', name: '환불 방어', unit: '퍼센트', monthly_target: 7 },
    { team: '운영', name: '출고시간 단축', unit: '시간', monthly_target: 1.7 },
    { team: '운영', name: '실물 재고 일치율 증가', unit: '퍼센트', monthly_target: 98 },
    { team: '유통혁신', name: '신규 유통 채널 매출', unit: '원', monthly_target: 5000000 },
    { team: '유통혁신', name: '인바운드 매입수량', unit: '건수', monthly_target: 100 },
    { team: '유통혁신', name: '아웃바운드 매입 대수', unit: '건수', monthly_target: 100 },
    { team: '품질관리', name: '리드효과 유지', unit: '리드효과', monthly_target: 1.8 },
    { team: '품질관리', name: '마감 산출물 달성률', unit: '퍼센트', monthly_target: 95 },
    { team: '품질관리', name: '산출물 수량 주 총량', unit: '수량', monthly_target: 1800 },
    { team: 'B2B 솔루션', name: '월간 출고 수량', unit: '수량', monthly_target: 300 },
    { team: 'B2B 솔루션', name: '판매 업무 매뉴얼화', unit: '건수', monthly_target: 6 },
    { team: 'B2B 솔루션', name: '고도몰 문의 전환 비율', unit: '퍼센트', monthly_target: 66 },
    { team: 'PI', name: '개선 과제 완료 건수', unit: '건수', monthly_target: 12 },
  ]
  const kpiMap = {}
  for (const kpi of kpis) {
    const teamId = teamMap[kpi.team]
    if (teamId) {
      const insertData = {
        team_id: teamId,
        name: kpi.name,
        unit: kpi.unit,
        monthly_target: kpi.monthly_target
      }
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/kpis`, {
          method: 'POST',
          headers,
          body: JSON.stringify(insertData)
        })
        const text = await res.text()
        if (res.ok) {
          console.log(`  ✓ ${kpi.name}`)
        }
        else {
          console.log(`  ✗ ${kpi.name} (${res.status}): ${text}`)
        }
      } catch (e) {
        console.log(`  ✗ ${kpi.name}: ${e.message}`)
      }
    }
  }

  // KPI ID 매핑을 새로 가져오기
  console.log('KPI ID 매핑 가져오는 중...')
  const kpiRes = await fetch(`${supabaseUrl}/rest/v1/kpis?select=id,name`, { headers })
  const kpiData = await kpiRes.json()
  kpiData.forEach(k => { kpiMap[k.name] = k.id })
  console.log('KPI ID 매핑:', kpiMap)

  // 3. 보고 데이터 마이그레이션
  console.log('3. 보고 데이터 마이그레이션...')
  const reports = [
    { team: '품질관리', kpi: '리드효과 유지', report_date: '2025-11-20', weekly_target: 2, weekly_achievement: 2, monthly_cumulative: 2, monthly_achievement_rate: 100 },
    { team: '유통혁신', kpi: '인바운드 매입수량', report_date: '2025-11-28', weekly_target: 100, weekly_achievement: 110, monthly_cumulative: 110, monthly_achievement_rate: 110 },
    { team: '운영', kpi: '상품추천 전환률', report_date: '2025-12-05', weekly_target: 27, weekly_achievement: 30, monthly_cumulative: 0.3, monthly_achievement_rate: 111.11 },
    { team: '운영', kpi: '환불 인입률 감소', report_date: '2025-12-05', weekly_target: 15, weekly_achievement: 9.7, monthly_cumulative: 9.7, monthly_achievement_rate: 64.67 },
    { team: '유통혁신', kpi: '신규 유통 채널 매출', report_date: '2025-12-11', weekly_target: 5000000, weekly_achievement: 0, monthly_cumulative: 0, monthly_achievement_rate: 0 },
    { team: '품질관리', kpi: '리드효과 유지', report_date: '2025-12-11', weekly_target: 2, weekly_achievement: 1, monthly_cumulative: 2.27, monthly_achievement_rate: 126.11 },
    { team: '마케팅', kpi: 'B2C ROAS', report_date: '2026-01-30', weekly_target: 1200, weekly_achievement: 1250, monthly_cumulative: 0, monthly_achievement_rate: 0 },
    { team: '마케팅', kpi: 'B2C 총 매출목표', report_date: '2026-01-30', weekly_target: 600000000, weekly_achievement: 210000000, monthly_cumulative: 790000000, monthly_achievement_rate: 131.67 },
    { team: '유통혁신', kpi: '인바운드 매입수량', report_date: '2026-01-02', weekly_target: 100, weekly_achievement: 20, monthly_cumulative: 20, monthly_achievement_rate: 20 },
    { team: 'B2B 솔루션', kpi: '월간 출고 수량', report_date: '2026-01-02', weekly_target: 300, weekly_achievement: 0, monthly_cumulative: 0, monthly_achievement_rate: 0 },
  ]

  for (const report of reports) {
    const teamId = teamMap[report.team]
    const kpiId = kpiMap[report.kpi]
    if (teamId && kpiId) {
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/reports`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            team_id: teamId,
            kpi_id: kpiId,
            report_date: report.report_date,
            weekly_target: report.weekly_target,
            weekly_achievement: report.weekly_achievement,
            monthly_cumulative: report.monthly_cumulative,
            monthly_achievement_rate: report.monthly_achievement_rate
          })
        })
        if (res.ok) console.log(`  ✓ ${report.team} - ${report.kpi}`)
        else {
          const text = await res.text()
          console.log(`  ✗ ${report.team} - ${report.kpi} (${res.status}): ${text}`)
        }
      } catch (e) {
        console.log(`  ✗ ${report.team} - ${report.kpi}: ${e.message}`)
      }
    } else {
      console.log(`  ✗ ${report.team} - ${report.kpi} (team or kpi not found)`)
    }
  }

  console.log('마이그레이션 완료!')
}

migrate().catch(console.error)
