import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppProvider'
import { STORAGE_KEY } from './lib/storage'
import { addDays, todayKey } from './lib/date'
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
