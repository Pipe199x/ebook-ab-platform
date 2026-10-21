export type Kind = 'cover' | 'title' | 'blurb' | 'idea'
export type Arm = 'A' | 'B'
export type Answer = 'yes' | 'no'

/** The four endings of D34. The edge service decides which one; the site only renders it. */
export type Ending = 'winner' | 'too_close' | 'not_sure' | 'not_fair'

export interface DuelVersion {
  arm: Arm
  title?: string
  blurb?: string
  coverUrl?: string
}

export interface Duel {
  id: string
  kind: Kind
  genre: string
  bookLanguage: string
  target: number
  status: 'open' | 'ended'
  versions: DuelVersion[]
  firstPage?: string
  writerLink?: string
}

export interface CreateDuelBody {
  kind: Kind
  genre: string
  bookLanguage: string
  versions: { arm: Arm; title?: string; blurb?: string }[]
  coverTypes: { arm: Arm; contentType: string }[]
  firstPage?: string
  writerLink?: string
}

export interface CreateDuelResponse {
  id: string
  shareUrl: string
  ownerUrl: string
  ownerKey: string
  covers: { arm: Arm; url: string; fields: Record<string, string> }[]
}

export interface Progress {
  status: 'open' | 'ended'
  readers: number
  target: number
  perArm: Record<Arm, number>
  /** D34: the split check flags a broken split. */
  fairSplit: boolean
  endsAt: string
}

export interface Result {
  status: 'open' | 'ended'
  ending?: Ending
  /** Present for 'winner' and 'too_close'. */
  winner?: Arm
  differencePct?: number
  ciLowPct?: number
  ciHighPct?: number
  /** Present for 'not_sure': readers still needed. */
  readersNeeded?: number
  fairSplit?: boolean
  perArm?: Record<Arm, number>
}
