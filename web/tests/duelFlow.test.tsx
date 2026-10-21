import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Home from '../src/pages/Home'
import DuelCreate from '../src/pages/DuelCreate'
import DuelVote from '../src/pages/DuelVote'
import DuelOwner from '../src/pages/DuelOwner'
import { api } from '../src/api'

// jsdom has no Response; a plain stand-in keeps the tests deterministic.
const json = (value: unknown, ok = true) =>
  ({ ok, status: ok ? 200 : 404, json: async () => value }) as unknown as Response

// Routes (not a bare MemoryRouter) so useParams can read :id.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<DuelCreate />} />
        <Route path="/d/:id" element={<DuelVote />} />
        <Route path="/duel/:id" element={<DuelOwner />} />
      </Routes>
    </MemoryRouter>,
  )
}

// Both arms, because the version shown is chosen on the device.
const DUEL = {
  id: 'd1',
  kind: 'blurb' as const,
  genre: 'Fantasy',
  bookLanguage: 'English',
  target: 330,
  status: 'open' as const,
  versions: [
    { arm: 'A' as const, title: 'The Wrong Door' },
    { arm: 'B' as const, title: 'The Other Door' },
  ],
  firstPage: 'It was a dark and stormy night.',
  writerLink: 'https://example.com/author',
}
const SHOWN = /The (Wrong|Other) Door/

const PROGRESS = {
  status: 'open' as const,
  readers: 180,
  target: 330,
  perArm: { A: 90, B: 90 },
  fairSplit: true,
  endsAt: '2026-11-04T00:00:00Z',
}

/** Fills the create form for the blurb kind, which needs no files. */
async function fillBlurbForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Blurb' }))
  const blurbs = screen.getAllByPlaceholderText('Blurb for this version')
  await user.type(blurbs[0], 'Version A blurb')
  await user.type(blurbs[1], 'Version B blurb')
  await user.selectOptions(screen.getAllByRole('combobox')[0], 'Fantasy')
  await user.selectOptions(screen.getAllByRole('combobox')[1], 'English')
}

describe('home: three doors (L5)', () => {
  it('shows all three', () => {
    renderAt('/')
    for (const door of ['Which cover?', 'Losing money on ads?', 'Did my change work?']) {
      expect(screen.getByText(door)).toBeTruthy()
    }
  })

  it('counts from the frozen snapshot (C11) and wears a source badge (D28)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ totalResults: 41 }))
    renderAt('/')
    expect(await screen.findByText('41 results so far')).toBeTruthy()
    expect(screen.getByText('from our results')).toBeTruthy()
  })

  it('says "be one of the first" at zero, never an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ totalResults: 0 }))
    renderAt('/')
    expect(await screen.findByText('No results yet. Be one of the first.')).toBeTruthy()
  })

  it('stays whole when the snapshot is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
    renderAt('/')
    expect(screen.getByText('Which cover?')).toBeTruthy()
  })
})

describe('duel: create and share', () => {
  it('refuses an incomplete form before any request', async () => {
    const user = userEvent.setup()
    renderAt('/new')
    await user.click(screen.getByText('Create the Duel'))
    expect(screen.getByRole('alert').textContent).toBe('Please fill in both versions.')
  })

  it('refuses a link that is not http(s)', async () => {
    const user = userEvent.setup()
    renderAt('/new')
    await fillBlurbForm(user)
    await user.type(screen.getByPlaceholderText('https://'), 'example.com/author')
    await user.click(screen.getByText('Create the Duel'))
    expect(screen.getByRole('alert').textContent).toBe(
      'That link needs to start with http:// or https://.',
    )
  })

  it('creates, then shares one link and keeps the private key on the device', async () => {
    const user = userEvent.setup()
    const create = vi.spyOn(api, 'createDuel').mockResolvedValue({
      id: 'd1',
      shareUrl: '/d/d1',
      ownerUrl: '/duel/d1',
      ownerKey: 'ok-1',
      covers: [],
    })

    renderAt('/new')
    await fillBlurbForm(user)
    await user.click(screen.getByText('Create the Duel'))

    await screen.findByText('Your Duel is ready')
    expect(screen.getByTestId('share-url').textContent).toMatch(/\/d\/d1$/)
    expect(
      screen.getByText(
        'The result opens at 330 readers. That is enough to see a clear difference.',
      ),
    ).toBeTruthy()
    expect(create).toHaveBeenCalledOnce()
    expect(localStorage.getItem('duel.owner.d1')).toBe('ok-1')
  })
})

describe('duel: readers vote', () => {
  it('shows one version, votes once, then thanks with the first page', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getDuel').mockResolvedValue(DUEL)
    const vote = vi.spyOn(api, 'vote').mockResolvedValue({ ok: true })

    renderAt('/d/d1')
    await screen.findByText('Which would you read?')
    expect(screen.getByText(SHOWN)).toBeTruthy()
    // the reward is not shown before the vote
    expect(screen.queryByText(DUEL.firstPage)).toBeNull()

    await user.click(screen.getByText('Yes, I would'))
    await screen.findByText('Thank you. Here is the first page.')
    expect(screen.getByText(DUEL.firstPage)).toBeTruthy()
    expect(screen.getByText('Do you write? Test yours free.')).toBeTruthy()
    expect(screen.getByText('Tell me when it is out')).toBeTruthy()
    expect(vote).toHaveBeenCalledOnce()
  })

  it('sends one arm only, chosen on the device (one version per person)', async () => {
    const user = userEvent.setup()
    vi.spyOn(api, 'getDuel').mockResolvedValue(DUEL)
    const vote = vi.spyOn(api, 'vote').mockResolvedValue({ ok: true })

    renderAt('/d/d1')
    await screen.findByText('Which would you read?')
    await user.click(screen.getByText('Yes, I would'))

    const [id, arm, answer] = vote.mock.calls[0]
    expect(id).toBe('d1')
    expect(['A', 'B']).toContain(arm)
    expect(answer).toBe('yes')
  })

  it("never counts the writer's own device", async () => {
    localStorage.setItem('duel.owner.d1', 'ok-1')
    vi.spyOn(api, 'getDuel').mockResolvedValue(DUEL)
    const vote = vi.spyOn(api, 'vote').mockResolvedValue({ ok: true })

    renderAt('/d/d1')
    await screen.findByText('Thank you. Here is the first page.')
    expect(vote).not.toHaveBeenCalled()
  })

  it('surfaces an ended Duel instead of a vote', async () => {
    vi.spyOn(api, 'getDuel').mockRejectedValue(new Error('This Duel has ended.'))
    renderAt('/d/d1')
    await screen.findByText('This Duel has ended.')
  })
})

describe('duel: progress without peeking', () => {
  it('shows readers and the fair split, and never asks for the result', async () => {
    localStorage.setItem('duel.owner.d1', 'ok-1')
    vi.spyOn(api, 'progress').mockResolvedValue(PROGRESS)
    const result = vi.spyOn(api, 'result')

    renderAt('/duel/d1')
    await screen.findByText('How it is going')
    expect(screen.getByTestId('readers').textContent).toContain('180 / 330')
    expect(screen.getByText('Both versions are getting a fair share of readers.')).toBeTruthy()
    expect(
      screen.getByText('We never show the winner before the end. That is deliberate.'),
    ).toBeTruthy()
    // D34/§3.13: no peeking. The client must not even ask.
    expect(result).not.toHaveBeenCalled()
  })

  it('flags a broken split', async () => {
    localStorage.setItem('duel.owner.d1', 'ok-1')
    vi.spyOn(api, 'progress').mockResolvedValue({ ...PROGRESS, fairSplit: false })
    renderAt('/duel/d1')
    await screen.findByText('How it is going')
    expect(
      screen.getByText('One version is getting far more readers than the other. Something is off.'),
    ).toBeTruthy()
  })
})

describe('duel: the four endings (D34)', () => {
  function ended(result: Awaited<ReturnType<typeof api.result>>) {
    localStorage.setItem('duel.owner.d1', 'ok-1')
    vi.spyOn(api, 'progress').mockResolvedValue({ ...PROGRESS, status: 'ended' })
    vi.spyOn(api, 'result').mockResolvedValue(result)
  }

  it('"Readers chose version B", with the curious details', async () => {
    ended({
      status: 'ended',
      ending: 'winner',
      winner: 'B',
      differencePct: 12.4,
      ciLowPct: 3.1,
      ciHighPct: 21.7,
      fairSplit: true,
    })
    renderAt('/duel/d1')
    await screen.findByText('Readers chose version B.')
    expect(screen.getByTestId('ending').dataset.ending).toBe('winner')
    expect(screen.getByText(/\+12\.4%/)).toBeTruthy()
    expect(screen.getByText(/\+3\.1% — \+21\.7%/)).toBeTruthy()
  })

  it('"Too close to call. Both work."', async () => {
    ended({ status: 'ended', ending: 'too_close', ciLowPct: -1, ciHighPct: 1.5, fairSplit: true })
    renderAt('/duel/d1')
    expect(
      await screen.findByText(
        'Too close to call. Both work. Pick the one you love and stop worrying.',
      ),
    ).toBeTruthy()
  })

  it('"Not sure yet: about N more readers"', async () => {
    ended({ status: 'ended', ending: 'not_sure', readersNeeded: 40, fairSplit: true })
    renderAt('/duel/d1')
    expect(
      await screen.findByText('Not sure yet: about 40 more readers would settle it.'),
    ).toBeTruthy()
  })

  it('"Not fair yet"', async () => {
    ended({ status: 'ended', ending: 'not_fair', fairSplit: false })
    renderAt('/duel/d1')
    expect(
      await screen.findByText(
        'Not fair yet. One version was seen by far more readers, so we cannot compare them.',
      ),
    ).toBeTruthy()
  })

  it('states what a Duel measures, and what it does not', async () => {
    ended({ status: 'ended', ending: 'too_close', fairSplit: true })
    renderAt('/duel/d1')
    await screen.findByText('The result')
    expect(
      screen.getByText(
        'A Duel measures what readers thought of the first page, in a fair test. Not sales.',
      ),
    ).toBeTruthy()
  })

  it('the check box adds the result to the library (C10)', async () => {
    ended({ status: 'ended', ending: 'too_close', fairSplit: true })
    const lib = vi.spyOn(api, 'addToLibrary').mockResolvedValue({ ok: true })
    renderAt('/duel/d1')
    await screen.findByText('The result')
    await userEvent.setup().click(screen.getByRole('checkbox'))
    expect(lib).toHaveBeenCalledOnce()
  })
})
