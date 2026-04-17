'use client'

import { BookOpen, ChevronDown, ChevronRight, AlertTriangle, HelpCircle, CheckCircle, Lightbulb } from 'lucide-react'
import { useState } from 'react'

/* ───────────────────────── 타입 정의 ───────────────────────── */

interface StepData {
  number: number
  title: string
  summary: string
  instructions: string[]
  tips?: string[]
  warnings?: string[]
  details?: { label: string; items: string[] }[]
}

interface GlossaryItem {
  term: string
  definition: string
}

interface FaqItem {
  question: string
  answer: string
}

/* ───────────────────────── 단계별 콘텐츠 ───────────────────────── */

const STEPS: StepData[] = [
  {
    number: 1,
    title: '프로그램 열기',
    summary: '브라우저에서 KPI Tracker에 접속합니다.',
    instructions: [
      '크롬(Chrome) 브라우저를 엽니다',
      '주소창에 **http://kpi.도구모음.com** 을 입력하고 Enter를 누르세요',
      '화면이 뜨면 성공! 상단에 메뉴가 보입니다',
    ],
    details: [
      {
        label: '상단 메뉴 구성',
        items: [
          '**대시보드** — 전체 현황을 한눈에 보는 곳 (홈 화면)',
          '**보고서** — 매주 실적을 입력하는 곳',
          '**분석** — 주간/월간 성과를 분석하는 곳',
          '**관리** — 팀과 KPI를 등록·수정하는 곳',
          '**매뉴얼** — 지금 보고 있는 이 가이드',
        ],
      },
    ],
    tips: ['처음이라면 **STEP 2 → 3 → 5** 순서대로만 하면 바로 시작할 수 있어요!'],
  },
  {
    number: 2,
    title: '팀 등록하기',
    summary: '우리 회사의 팀을 등록합니다. (처음 1번만 하면 됩니다)',
    instructions: [
      '상단 메뉴에서 **관리** 클릭',
      '**KPI 관리** 탭이 보입니다',
      '오른쪽 위의 **팀 추가** 버튼 클릭',
      '**팀명** 입력 (예: 마케팅팀)',
      '**팀장** 이름 입력 (예: 김철수)',
      '부팀장이 있으면 **부팀장**도 입력 (없으면 비워두세요)',
      '**저장** 클릭하면 완료!',
    ],
    tips: [
      '팀을 먼저 만들어야 KPI를 추가할 수 있어요.',
      '팀 이름이나 팀장은 나중에 수정 가능합니다.',
    ],
  },
  {
    number: 3,
    title: 'KPI 등록하기',
    summary: '각 팀이 매주 측정할 목표(KPI)를 등록합니다. (처음 1번만)',
    instructions: [
      '**관리** → **KPI 관리** 탭으로 이동',
      'KPI를 등록할 **팀 버튼**을 클릭',
      '**KPI 추가** 버튼 클릭',
      '아래 항목들을 채워주세요',
      '다 채웠으면 **저장** 클릭!',
    ],
    details: [
      {
        label: '입력 항목 설명',
        items: [
          '**KPI명** — 측정할 항목 이름 (예: 월 매출액, 신규 고객 수)',
          '**단위** — 숫자의 단위 (예: 원, 건, %, 명)',
          '**방향성** — 이게 중요해요!',
          '  "높을수록 좋음" = 매출, 고객 수처럼 **많을수록 좋은 것**',
          '  "낮을수록 좋음" = 불량률, 환불률처럼 **적을수록 좋은 것**',
          '**가중치** — 중요도 (1~10). 중요한 KPI일수록 높게 설정',
          '**월간목표** — 한 달 동안 달성할 목표 숫자',
          '**주간목표** — 한 주 동안 달성할 목표 숫자',
          '**연간목표** — 1년 목표 (선택사항)',
          '**설명** — KPI에 대한 메모 (선택사항)',
          '**시작월** — 이 KPI를 측정하기 시작한 달 (선택사항)',
        ],
      },
    ],
    tips: [
      '잘 모르겠으면 **KPI명, 단위, 방향성, 월간목표, 주간목표**만 채워도 충분해요.',
    ],
    warnings: [
      '**방향성**을 잘못 설정하면 달성률이 반대로 나옵니다! 예: 불량률은 반드시 "낮을수록 좋음"으로 설정하세요.',
    ],
  },
  {
    number: 4,
    title: '월별 목표 따로 설정하기 (선택)',
    summary: '매달 목표가 다르다면 월별로 다르게 설정할 수 있어요.',
    instructions: [
      '**관리** → **KPI 관리** → 팀 선택',
      '원하는 KPI 옆의 **달력 아이콘 (📅)** 클릭',
      '**대상 월** 선택 (예: 2026-04)',
      '해당 월의 **월간목표**와 **주간목표** 입력',
      '**목표 저장** 클릭',
    ],
    tips: [
      '이 설정을 안 하면 KPI에 등록한 기본 목표가 매달 그대로 사용됩니다.',
      '성수기/비수기에 따라 목표를 다르게 설정할 때 유용해요.',
    ],
  },
  {
    number: 5,
    title: '주간 보고서 작성하기 ★',
    summary: '매주 금요일, 이번 주 성과를 입력합니다. 가장 중요한 단계!',
    instructions: [
      '상단 메뉴에서 **보고서** 클릭',
      '**일괄 입력** 탭이 기본으로 선택되어 있습니다',
      '자신의 **팀 버튼**을 클릭',
      '**보고 날짜** 확인 — 오늘 날짜가 자동으로 들어갑니다',
      '각 KPI 행을 **클릭**하면 입력창이 펼쳐집니다',
      '**주간 달성** 칸에 이번 주 실적 숫자를 입력하세요 — 달성률은 자동 계산!',
      '아래 **PDCA** 항목도 작성하세요',
      '모든 KPI를 다 채웠으면 하단의 **전체 저장** 클릭!',
    ],
    details: [
      {
        label: 'PDCA란? (매주 적는 개선 일지)',
        items: [
          '**전략** — 이번 달의 큰 방향 (예: "온라인 마케팅 강화")',
          '**PLAN (계획)** — 이번 주 할 일. 지난주 ACTION이 자동으로 채워져요',
          '**DO (실행)** — 실제로 한 일 (예: "인스타 광고 3건 집행")',
          '**CHECK (분석)** — 왜 이런 결과가 나왔는지 (예: "광고 전환율이 낮았음")',
          '**ACTION (다음 주)** — 분석을 바탕으로 다음 주에 할 일',
          '**해결과제** — 해결이 필요한 문제. 적으면 **액션 아이템에 자동 등록**됩니다!',
          '**필요한 도움** — 다른 팀이나 리더에게 부탁할 사항',
        ],
      },
    ],
    tips: [
      'PLAN은 지난주 ACTION에서 자동으로 복사됩니다. 수정할 수 있어요.',
      '전략도 지난주 것이 자동으로 들어오니, 변경이 없으면 그대로 두세요.',
      '숫자만 입력하면 **달성률**과 **월간 누적**은 프로그램이 알아서 계산해줍니다.',
    ],
    warnings: [
      '**마감: 매주 금요일 12:30까지** 입력해주세요.',
      '"해결과제"에 적은 내용은 **자동으로 액션 추적**에 등록됩니다.',
    ],
  },
  {
    number: 6,
    title: '대시보드에서 확인하기',
    summary: '전체 팀의 KPI 현황을 한눈에 봅니다.',
    instructions: [
      '상단 메뉴에서 **대시보드** 클릭 (또는 로고 클릭)',
      '기본으로 **팀장 뷰** 탭이 선택되어 있습니다',
      '위쪽의 **팀 버튼**으로 특정 팀만 필터링할 수 있어요',
      '**날짜 필터**로 기간을 바꿀 수 있어요 (이번 주, 지난 주, 이번 달...)',
      '표에서 **KPI 행을 클릭**하면 PDCA 내용이 펼쳐집니다',
      '펼친 상태에서 **코멘트**를 남길 수 있어요 (피드백용)',
    ],
    tips: [
      '↑ 초록 화살표 = 지난주보다 좋아짐 / ↓ 빨간 화살표 = 지난주보다 나빠짐',
      'KPI 이름을 클릭하면 **히스토리 페이지**로 바로 이동합니다.',
      '오른쪽 위의 **CSV 내보내기** 버튼으로 엑셀용 데이터를 받을 수 있어요.',
    ],
  },
  {
    number: 7,
    title: 'CEO 브리핑 보기',
    summary: '경영진 회의 전에 전체 현황을 1페이지로 확인합니다.',
    instructions: [
      '**대시보드** → **CEO 브리핑** 탭 클릭',
      '자동으로 정리된 내용을 확인하세요',
      '필요하면 **인쇄** 버튼으로 회의 자료를 출력하세요',
    ],
    details: [
      {
        label: 'CEO 브리핑에서 자동으로 보여주는 정보',
        items: [
          '**A. 핵심 지표** — 이번 주 vs 지난 주 비교',
          '**B. 위험 KPI** — 2주 이상 연속으로 목표 미달인 것 (노란/빨간 경고)',
          '**C. ACTION 실행률** — 지난주에 "하겠다"고 한 것을 실제로 했는지',
          '**D. 팀별 이슈** — 각 팀이 도움을 요청한 사항',
          '**E. 미제출 현황** — 아직 보고서를 안 낸 팀',
        ],
      },
    ],
  },
  {
    number: 8,
    title: '분석 활용하기',
    summary: '더 깊은 분석과 회의 자료를 만듭니다.',
    instructions: [
      '상단 메뉴에서 **분석** 클릭',
      '3가지 탭 중 원하는 것을 선택하세요',
      '각 탭에서 **인쇄** 버튼으로 회의 자료를 출력할 수 있습니다',
    ],
    details: [
      {
        label: '분석 탭 종류',
        items: [
          '**주간 요약** — 이번 주 전체 요약. 팀 순위, TOP/BOTTOM KPI, 이슈 모아보기',
          '**월간 리포트** — 월별 성과 집계. 지난달 대비 변화, 팀별 막대 차트',
          '**KPI 히스토리** — 특정 KPI를 선택하면 주차별 변화 추이와 PDCA 타임라인',
        ],
      },
    ],
    tips: ['월간 리포트는 월초에, 주간 요약은 금요일 오후에 보면 좋아요.'],
  },
  {
    number: 9,
    title: '액션 아이템 관리하기',
    summary: '해결해야 할 과제를 추적하고 상태를 관리합니다.',
    instructions: [
      '**대시보드** → **액션 추적** 탭 클릭',
      '각 아이템의 현재 상태를 확인하세요',
      '상태를 변경하려면 해당 아이템의 **상태 버튼**을 클릭',
      '새 아이템을 직접 추가할 수도 있어요',
    ],
    details: [
      {
        label: '액션 아이템 상태 3가지',
        items: [
          '**미해결** (빨간) — 아직 시작하지 않은 과제',
          '**진행중** (노란) — 현재 처리하고 있는 과제',
          '**해결됨** (초록) — 완료된 과제',
        ],
      },
    ],
    tips: [
      '보고서의 "해결과제"에 적으면 자동으로 여기에 등록됩니다.',
      '위쪽 필터로 **팀별**, **상태별**로 골라볼 수 있어요.',
    ],
  },
  {
    number: 10,
    title: '매주 반복하기',
    summary: '이 시스템은 매주 반복할수록 힘을 발휘합니다!',
    instructions: [
      '**매주 금요일 12:30까지** → STEP 5 (보고서 작성)',
      '**금요일 오후** → STEP 6~7 (대시보드 + CEO 브리핑 확인)',
      '**필요할 때** → STEP 9 (액션 아이템 상태 업데이트)',
      '**월초** → STEP 4 (다음 달 목표 조정, 필요한 경우)',
    ],
    details: [
      {
        label: 'PDCA가 자동으로 연결되는 방식',
        items: [
          '이번 주 **ACTION** (다음 주에 할 일)을 적으면',
          '→ 다음 주 보고서의 **PLAN**에 자동으로 복사됩니다',
          '→ 계획을 실행하고 **DO**에 기록',
          '→ 결과를 분석하고 **CHECK**에 기록',
          '→ 개선점을 찾아 **ACTION**에 기록',
          '→ 이것이 또 다음 주 **PLAN**이 됩니다... 이렇게 계속 돌아가요!',
        ],
      },
    ],
    tips: [
      '처음 몇 주는 어색하지만, 4주만 하면 금방 익숙해집니다.',
      '완벽하게 쓰려고 하지 마세요. 짧게라도 꾸준히 쓰는 게 훨씬 중요해요!',
    ],
  },
]

/* ───────────────────────── 용어 사전 ───────────────────────── */

const GLOSSARY: GlossaryItem[] = [
  {
    term: 'KPI',
    definition:
      'Key Performance Indicator. 팀의 성적표 같은 거예요. "이번 달 매출 1억" 같은 구체적인 숫자 목표입니다.',
  },
  {
    term: 'PDCA',
    definition:
      'Plan(계획) → Do(실행) → Check(분석) → Action(개선). 매주 반복하는 개선 사이클이에요.',
  },
  {
    term: '달성률',
    definition:
      '(실적 ÷ 목표) × 100. 100% 이상이면 목표 달성! 예: 목표 100건, 실적 120건 → 달성률 120%',
  },
  {
    term: '월간 누적',
    definition: '이번 달 1주차부터 지금까지 쌓인 총 실적. 매주 자동으로 합산됩니다.',
  },
  {
    term: '방향성',
    definition:
      '"높을수록 좋음" = 매출, 고객 수 (많을수록 좋은 것). "낮을수록 좋음" = 불량률 (적을수록 좋은 것).',
  },
  {
    term: '가중치',
    definition:
      'KPI의 중요도 (1~10). 높을수록 전체 평균 계산에 더 많이 반영돼요.',
  },
  {
    term: '액션 아이템',
    definition:
      '해결해야 할 과제. 보고서에 "해결과제"를 적으면 자동으로 만들어져요.',
  },
  {
    term: '일괄 입력',
    definition:
      '한 팀의 모든 KPI를 한 화면에서 한꺼번에 입력하는 방식. 보고서 작성의 기본 모드입니다.',
  },
  {
    term: '시작월 (base_month)',
    definition:
      'KPI 측정을 시작한 달. 이전 달의 데이터는 집계에서 제외됩니다.',
  },
  {
    term: '월별 목표',
    definition:
      '특정 달에만 다른 목표를 설정한 것. 설정하지 않으면 KPI의 기본 목표가 사용돼요.',
  },
]

/* ───────────────────────── FAQ ───────────────────────── */

const FAQ_ITEMS: FaqItem[] = [
  {
    question: '이전 보고서를 수정하고 싶어요',
    answer:
      '보고서 페이지에서 같은 팀, 같은 날짜로 다시 입력하면 자동으로 덮어쓰기(수정)됩니다. 대시보드에서 해당 행의 수정 버튼을 눌러도 됩니다.',
  },
  {
    question: 'KPI를 완료 처리하고 싶어요',
    answer:
      '관리 → KPI 관리 → 팀 선택 → 해당 KPI 옆의 체크(✓) 아이콘을 클릭하세요. 완료된 KPI는 "완료" 탭으로 이동됩니다.',
  },
  {
    question: '월간 목표를 바꾸고 싶어요',
    answer:
      '관리 → KPI 관리 → 팀 선택 → KPI 옆의 달력(📅) 아이콘 클릭 → 해당 월의 목표를 수정하세요.',
  },
  {
    question: 'PLAN이 자동으로 채워져 있어요. 왜요?',
    answer:
      '지난주 ACTION에 적은 내용이 이번 주 PLAN에 자동으로 복사됩니다. PDCA 사이클의 연속성을 위한 기능이에요. 수정 가능합니다.',
  },
  {
    question: '해결과제를 적었는데 액션 추적에 안 나와요',
    answer:
      '보고서를 "전체 저장"해야 자동 생성됩니다. 저장 후 대시보드 → 액션 추적 탭에서 확인하세요.',
  },
  {
    question: '보고서를 빠뜨렸어요. 이전 주 날짜로 입력할 수 있나요?',
    answer:
      '네! 보고서 페이지에서 날짜를 과거 날짜로 바꿔서 입력하면 됩니다. 금요일 마감 이후에도 입력 가능해요.',
  },
  {
    question: 'KPI를 삭제하고 싶어요',
    answer:
      '관리 → KPI 관리 → 팀 선택 → 해당 KPI 옆의 삭제(🗑️) 아이콘을 클릭하세요. 삭제하면 해당 KPI의 모든 보고서 데이터도 함께 삭제되니 주의하세요!',
  },
  {
    question: '데이터를 완전히 초기화하고 싶어요',
    answer:
      '관리 → 데이터 탭 → "전체 초기화" 버튼을 클릭하세요. 모든 팀, KPI, 보고서가 삭제됩니다. 되돌릴 수 없으니 신중하게!',
  },
]

/* ───────────────────────── 볼드 텍스트 파서 ───────────────────────── */

const renderBold = (text: string) => {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="font-semibold text-white">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

/* ───────────────────────── StepCard 컴포넌트 ───────────────────────── */

const StepCard = ({
  step,
  isOpen,
  onToggle,
}: {
  step: StepData
  isOpen: boolean
  onToggle: () => void
}) => {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* 헤더 (클릭 가능) */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-800/50 transition-colors"
      >
        {/* 번호 원형 */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          step.number === 5 ? 'bg-amber-500' : 'bg-blue-600'
        }`}>
          <span className="text-white font-bold text-lg">{step.number}</span>
        </div>

        {/* 제목 + 요약 */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">{step.title}</h2>
          <p className="text-sm text-gray-400 mt-0.5">{step.summary}</p>
        </div>

        {/* 펼침 아이콘 */}
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* 본문 (펼쳤을 때) */}
      {isOpen && (
        <div className="px-5 pb-5 pt-0 ml-14 space-y-4">
          {/* 따라하기 */}
          <div>
            <h3 className="text-sm font-semibold text-blue-400 mb-2">
              따라하기
            </h3>
            <ol className="space-y-2">
              {step.instructions.map((inst, i) => (
                <li key={i} className="flex gap-3 text-gray-300 text-sm">
                  <span className="text-blue-400 font-mono font-semibold flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span>{renderBold(inst)}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 상세 항목 */}
          {step.details?.map((detail, di) => (
            <div
              key={di}
              className="bg-gray-800/60 rounded-lg p-4 border border-gray-700/50"
            >
              <h4 className="text-sm font-semibold text-gray-300 mb-2">
                {detail.label}
              </h4>
              <ul className="space-y-1.5">
                {detail.items.map((item, ii) => (
                  <li
                    key={ii}
                    className="text-sm text-gray-400 flex gap-2"
                  >
                    <span className="text-gray-500 flex-shrink-0">-</span>
                    <span>{renderBold(item)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* 팁 */}
          {step.tips && step.tips.length > 0 && (
            <div className="border-l-4 border-amber-500 bg-amber-500/10 rounded-r-lg p-3 space-y-2">
              {step.tips.map((tip, i) => (
                <div key={i} className="flex gap-2 text-sm text-amber-200">
                  <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{renderBold(tip)}</span>
                </div>
              ))}
            </div>
          )}

          {/* 주의 */}
          {step.warnings && step.warnings.length > 0 && (
            <div className="border-l-4 border-red-500 bg-red-500/10 rounded-r-lg p-3 space-y-2">
              {step.warnings.map((warn, i) => (
                <div key={i} className="flex gap-2 text-sm text-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <span>{renderBold(warn)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── 메인 페이지 ───────────────────────── */

export default function ManualPage() {
  const [openSteps, setOpenSteps] = useState<Set<number>>(new Set([1]))
  const [openFaq, setOpenFaq] = useState<Set<number>>(new Set())

  const toggleStep = (n: number) => {
    setOpenSteps((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const toggleFaq = (n: number) => {
    setOpenFaq((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const expandAll = () => {
    setOpenSteps(new Set(STEPS.map((s) => s.number)))
  }

  const collapseAll = () => {
    setOpenSteps(new Set())
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* ── 헤더 ── */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden mb-8">
          <div className="h-1 bg-blue-600" />
          <div className="p-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">사용 매뉴얼</h1>
                <p className="text-gray-400 text-sm mt-1">
                  처음이세요? 아래 단계를 순서대로 따라하면 됩니다!
                </p>
              </div>
            </div>

            {/* 전체 흐름 요약 */}
            <div className="mt-4 bg-gray-800/60 rounded-lg p-4 border border-gray-700/50">
              <p className="text-xs text-gray-500 mb-2">전체 흐름 한눈에 보기</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">팀 등록</span>
                <span className="text-gray-600">→</span>
                <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">KPI 등록</span>
                <span className="text-gray-600">→</span>
                <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-medium">매주 보고서 작성</span>
                <span className="text-gray-600">→</span>
                <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">대시보드 확인</span>
                <span className="text-gray-600">→</span>
                <span className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-xs font-medium">분석 & 개선</span>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                팀/KPI 등록은 <span className="text-blue-400">처음 1번만</span>,
                보고서 작성은 <span className="text-amber-400">매주 반복</span>합니다.
              </p>
            </div>

            {/* 전체 펼치기/접기 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={expandAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                전체 펼치기
              </button>
              <span className="text-gray-600 text-xs">|</span>
              <button
                onClick={collapseAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                전체 접기
              </button>
            </div>
          </div>
        </div>

        {/* ── 단계별 카드 ── */}
        <div className="space-y-4 mb-12">
          {STEPS.map((step) => (
            <StepCard
              key={step.number}
              step={step}
              isOpen={openSteps.has(step.number)}
              onToggle={() => toggleStep(step.number)}
            />
          ))}
        </div>

        {/* ── 용어 설명 ── */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">용어 설명</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GLOSSARY.map((item, i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-xl border border-gray-700 p-4"
              >
                <h3 className="text-sm font-semibold text-blue-400 mb-1">
                  {item.term}
                </h3>
                <p className="text-sm text-gray-400">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-bold text-white">자주 묻는 질문</h2>
          </div>
          <div className="space-y-3">
            {FAQ_ITEMS.map((faq, i) => (
              <div
                key={i}
                className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-800/50 transition-colors"
                >
                  {openFaq.has(i) ? (
                    <ChevronDown className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )}
                  <span className="text-sm font-semibold text-white">
                    Q. {faq.question}
                  </span>
                </button>
                {openFaq.has(i) && (
                  <div className="px-4 pb-4 pl-11">
                    <div className="flex gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{faq.answer}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
