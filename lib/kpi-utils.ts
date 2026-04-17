import { KPI } from '@/types'

export interface KPIGroup {
  category: string | null
  program: string | null
  kpis: KPI[]
}

// KPI를 카테고리 > 프로그램으로 그룹핑
export const groupKpisByCategoryProgram = (kpiList: KPI[]): KPIGroup[] => {
  const grouped = new Map<string, Map<string, KPI[]>>()

  kpiList.forEach(kpi => {
    const catKey = kpi.category || '__uncategorized__'
    const progKey = kpi.program || '__no_program__'

    if (!grouped.has(catKey)) grouped.set(catKey, new Map())
    const catMap = grouped.get(catKey)!
    if (!catMap.has(progKey)) catMap.set(progKey, [])
    catMap.get(progKey)!.push(kpi)
  })

  const groups: KPIGroup[] = []

  // 카테고리 있는 것 먼저, 미분류 나중에
  const sortedCats = [...grouped.keys()].sort((a, b) => {
    if (a === '__uncategorized__') return 1
    if (b === '__uncategorized__') return -1
    return a.localeCompare(b)
  })

  sortedCats.forEach(catKey => {
    const catMap = grouped.get(catKey)!
    const sortedProgs = [...catMap.keys()].sort((a, b) => {
      if (a === '__no_program__') return 1
      if (b === '__no_program__') return -1
      return a.localeCompare(b)
    })
    sortedProgs.forEach(progKey => {
      groups.push({
        category: catKey === '__uncategorized__' ? null : catKey,
        program: progKey === '__no_program__' ? null : progKey,
        kpis: catMap.get(progKey)!,
      })
    })
  })

  return groups
}
