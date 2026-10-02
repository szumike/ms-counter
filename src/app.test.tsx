import { describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppProvider'
import { STORAGE_KEY } from './lib/storage'
import { addDays, longDayLabel, todayKey } from './lib/date'
import type { PersistedState } from './lib/types'

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AppProvider>
        <App />
      </AppProvider>
    </MemoryRouter>,
  )
}

function stored(): PersistedState {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
}

/** Writes are debounced, so persistence assertions have to settle first. */
async function expectStored(assert: (state: PersistedState) => void) {
  await waitFor(() => assert(stored()))
}

async function createCounter(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('link', { name: /create your first counter|new counter/i }))
  await user.type(screen.getByLabelText('Name'), name)
  await user.click(screen.getByRole('button', { name: 'Save' }))
}

describe('counter app', () => {
  it('shows the empty state on first run', () => {
    renderApp()
    expect(screen.getByText('Nothing counted yet')).toBeInTheDocument()
  })

  it('creates a counter and lands on its detail screen', async () => {
    const user = userEvent.setup()
    renderApp()

    await createCounter(user, 'Water')

    expect(screen.getByText('Water')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase by one' })).toBeInTheDocument()
    await expectStored((s) => expect(s.counters).toHaveLength(1))
  })

  it('counts up, clamps at zero on the way down, and persists', async () => {
    const user = userEvent.setup()
    renderApp()
    await createCounter(user, 'Water')

    const plus = screen.getByRole('button', { name: 'Increase by one' })
    const minus = screen.getByRole('button', { name: 'Decrease by one' })

    await user.click(plus)
    await user.click(plus)
    await user.click(minus)
    expect(screen.getByText('1')).toBeInTheDocument()

    await user.click(minus)
    await user.click(minus)
    await expectStored((s) => expect(s.counters[0].value).toBe(0))
  })

  it('resets with an undo that restores the previous value', async () => {
    const user = userEvent.setup()
    renderApp()
    await createCounter(user, 'Water')

    const plus = screen.getByRole('button', { name: 'Increase by one' })
    await user.click(plus)
    await user.click(plus)
    await user.click(plus)

    await user.click(screen.getByRole('button', { name: 'Reset to zero' }))
    expect(screen.getByText('Reset Water to 0')).toBeInTheDocument()
    await expectStored((s) => expect(s.counters[0].value).toBe(0))

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await expectStored((s) => expect(s.counters[0].value).toBe(3))
    expect(screen.queryByText('Reset Water to 0')).not.toBeInTheDocument()
  })

  it('shows goal progress on the list tile', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: /create your first counter/i }))
    await user.type(screen.getByLabelText('Name'), 'Water')
    await user.click(screen.getByRole('radio', { name: '8' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await user.click(screen.getByRole('button', { name: 'Increase by one' }))
    await user.click(screen.getByRole('button', { name: 'Increase by one' }))
    await user.click(screen.getByRole('link', { name: /Counters/ }))

    expect(screen.getByText('goal 8 · 25%')).toBeInTheDocument()
    expect(screen.getByText(/Resets daily at midnight · 1 counter$/)).toBeInTheDocument()
  })

  it('labels a goalless counter as lower-is-better', async () => {
    const user = userEvent.setup()
    renderApp()
    await createCounter(user, 'Cigarettes')
    await user.click(screen.getByRole('link', { name: /Counters/ }))

    expect(screen.getByText('no goal · lower is better')).toBeInTheDocument()
  })

  it('edits a counter without losing its value', async () => {
    const user = userEvent.setup()
    renderApp()
    await createCounter(user, 'Water')
    await user.click(screen.getByRole('button', { name: 'Increase by one' }))

    await user.click(screen.getByRole('link', { name: 'Edit' }))
    const nameField = screen.getByLabelText('Name')
    await user.clear(nameField)
    await user.type(nameField, 'Hydration')
    await user.click(screen.getByRole('radio', { name: 'Icon ☕' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('Hydration')).toBeInTheDocument()
    await expectStored((s) =>
      expect(s.counters[0]).toMatchObject({ name: 'Hydration', emoji: '☕', value: 1 }),
    )
  })

  it('blocks saving a counter with a blank name', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('link', { name: /create your first counter/i }))

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(screen.getByLabelText('Name'), '   ')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('deletes a counter only after confirmation', async () => {
    const user = userEvent.setup()
    renderApp()
    await createCounter(user, 'Water')
    await user.click(screen.getByRole('link', { name: 'Edit' }))

    await user.click(screen.getByRole('button', { name: 'Delete counter' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await expectStored((s) => expect(s.counters).toHaveLength(1))

    await user.click(screen.getByRole('button', { name: 'Delete counter' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete counter' }))

    expect(screen.getByText('Nothing counted yet')).toBeInTheDocument()
    await expectStored((s) => expect(s.counters).toHaveLength(0))
  })

  it('rolls a stale counter over on launch and keeps yesterday in history', async () => {
    const yesterday = addDays(todayKey(), -1)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        settings: { theme: 'system' },
        counters: [
          {
            id: 'a',
            name: 'Water',
            emoji: '💧',
            goal: 8,
            value: 6,
            history: {},
            lastActiveDay: yesterday,
            createdAt: '2020-01-01T00:00:00.000Z',
            order: 0,
          },
        ],
      }),
    )

    renderApp()

    // The stale value must never reach the screen.
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('6')).not.toBeInTheDocument()

    await expectStored((s) => {
      const [counter] = s.counters
      expect(counter.value).toBe(0)
      expect(counter.lastActiveDay).toBe(todayKey())
      expect(counter.history[yesterday]).toBe(6)
    })
  })

  describe('editing previous days', () => {
    const yesterday = () => addDays(todayKey(), -1)

    async function openCounter(user: ReturnType<typeof userEvent.setup>, goal?: string) {
      await user.click(screen.getByRole('link', { name: /create your first counter/i }))
      await user.type(screen.getByLabelText('Name'), 'Water')
      if (goal) await user.click(screen.getByRole('radio', { name: goal }))
      await user.click(screen.getByRole('button', { name: 'Save' }))
    }

    it('edits yesterday without touching today', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      expect(screen.getByText('Yesterday')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reset to zero' })).toBeDisabled()

      await user.click(screen.getByRole('button', { name: 'Increase by one' }))
      await user.click(screen.getByRole('button', { name: 'Increase by one' }))

      await expectStored((s) => {
        expect(s.counters[0].value).toBe(0)
        expect(s.counters[0].history[yesterday()]).toBe(2)
      })
    })

    it('returns to today with Back to today', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      await user.click(screen.getByRole('button', { name: 'Back to today' }))

      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Back to today' })).not.toBeInTheDocument()
    })

    it('limits navigation to today and 29 days back', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      expect(screen.getByRole('button', { name: 'Next day' })).toBeDisabled()
      const prev = screen.getByRole('button', { name: 'Previous day' })
      for (let i = 0; i < 29; i++) await user.click(prev)

      expect(prev).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Next day' })).toBeEnabled()
    })

    it('resets a past day with a dated toast and undoes it', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      const day = addDays(todayKey(), -2)
      await user.click(screen.getByRole('button', { name: 'Increase by one' }))
      await user.click(screen.getByRole('button', { name: 'Increase by one' }))
      await user.click(screen.getByRole('button', { name: 'Increase by one' }))

      await user.click(screen.getByRole('button', { name: 'Reset to zero' }))
      expect(screen.getByText(`Reset ${longDayLabel(day)} to 0`)).toBeInTheDocument()
      await expectStored((s) => expect(s.counters[0].history[day]).toBe(0))

      await user.click(screen.getByRole('button', { name: 'Undo' }))
      await expectStored((s) => expect(s.counters[0].history[day]).toBe(3))
    })

    it('selects a day by tapping the chart', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      await user.click(screen.getByRole('button', { name: `Show ${longDayLabel(addDays(todayKey(), -3))}` }))

      expect(screen.getByRole('button', { name: 'Back to today' })).toBeInTheDocument()
      expect(screen.getAllByText(longDayLabel(addDays(todayKey(), -3))).length).toBeGreaterThan(0)
    })

    it('widens the range when the selected day is older than it', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      const prev = screen.getByRole('button', { name: 'Previous day' })
      for (let i = 0; i < 10; i++) await user.click(prev)

      expect(screen.getByRole('button', { name: '14 days' })).toHaveAttribute('aria-pressed', 'true')
    })

    it('clamps the selection when a shorter range is picked', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      const prev = screen.getByRole('button', { name: 'Previous day' })
      for (let i = 0; i < 10; i++) await user.click(prev)
      await user.click(screen.getByRole('button', { name: '7 days' }))

      expect(screen.getByText(longDayLabel(addDays(todayKey(), -6)))).toBeInTheDocument()
    })

    it('keeps the pinned day selected when midnight pushes it out of the range', async () => {
      vi.useFakeTimers({ toFake: ['Date'], now: new Date() })
      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        renderApp()
        await openCounter(user)

        // Pin 6 days back (range 7), then let a day pass.
        await user.click(screen.getByRole('button', { name: `Show ${longDayLabel(addDays(todayKey(), -6))}` }))
        expect(screen.getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true')

        const pinned = addDays(todayKey(), -6)
        vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000)
        act(() => {
          document.dispatchEvent(new Event('visibilitychange'))
        })

        expect(screen.getByRole('button', { name: '14 days' })).toHaveAttribute('aria-pressed', 'true')
        expect(screen.getByRole('button', { name: `Show ${longDayLabel(pinned)}` })).toHaveAttribute(
          'aria-pressed',
          'true',
        )
      } finally {
        vi.useRealTimers()
      }
    })

    it('moves focus to Previous day after Back to today', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      await user.click(screen.getByRole('button', { name: 'Back to today' }))

      expect(screen.getByRole('button', { name: 'Previous day' })).toHaveFocus()
    })

    it('shows the goal on a past day only for a counter that has one', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user, '8')

      expect(screen.getByText('of 8 today')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      expect(screen.getByText('of 8')).toBeInTheDocument()
    })

    it('hides the goal line on a past day for a goalless counter', async () => {
      const user = userEvent.setup()
      renderApp()
      await openCounter(user)

      // The chart axis also says "today", so target the goal line by its class.
      const goalLine = () => document.querySelector('.detail__goal')
      expect(goalLine()).toHaveTextContent(/^today$/)
      await user.click(screen.getByRole('button', { name: 'Previous day' }))
      expect(goalLine()).toBeNull()
    })
  })

  it('persists the appearance choice from settings', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    await user.click(screen.getByRole('radio', { name: /Dark/ }))

    expect(document.documentElement.dataset.theme).toBe('dark')
    await expectStored((s) => expect(s.settings.theme).toBe('dark'))
  })

  it('redirects to the list when a counter id does not exist', () => {
    render(
      <MemoryRouter initialEntries={['/c/missing']}>
        <AppProvider>
          <App />
        </AppProvider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Nothing counted yet')).toBeInTheDocument()
  })
})
