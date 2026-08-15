export interface MorphForm {
  full: string
  stem: string
  ending: string
  irregular?: boolean
  irregularNote?: string
}

export interface VerbProfile {
  stem: string
  // Generated source data includes language-specific and legacy values, plus
  // a small number of records using the historical `infiniteEnding` spelling.
  infinitiveEnding?: string | null
  infiniteEnding?: string | null
  irregularType?: string | null
  phase1: {
    label: string
    hint: string
    imperativeFormal: MorphForm
    imperativeInformal: MorphForm
    presentYo: MorphForm
    presentTu: MorphForm
    presentEl: MorphForm
  }
  phase2: {
    label: string
    hint: string
    gerund: MorphForm
    pastParticiple: MorphForm
    presentNosotros: MorphForm
    presentEllos: MorphForm
  }
  phase3: {
    label: string
    hint: string
    subjunctiveEl: MorphForm
    subjunctiveTu: MorphForm
    preteriteYo: MorphForm
    preteriteEl: MorphForm
  }
  englishParallel: string
  clinicalNote: string
}

export type WordCategory =
  | 'core'
  | 'medical'
  | 'construction'
  | 'daily'
  | 'mission'
  | 'hospitality'
  | 'sports'
  | 'business'
  | 'academic'

export interface DictWord {
  id: string
  word: string
  english: string
  pronunciation: string
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'phrase'
  gender?: 'masculine' | 'feminine'
  category: WordCategory
  context?: string
  verbProfileId?: string
  verbProfile?: VerbProfile
  examples: { target: string; english: string }[]
}
