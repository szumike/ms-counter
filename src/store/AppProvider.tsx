import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { load, save } from '../lib/storage'
import { valueOn } from '../lib/chart'
import { msUntilNextMidnight, todayKey } from '../lib/date'
import type { ThemeChoice } from '../lib/types'
import {
  CountersContext,
  ThemeContext,
  type CountersApi,
  type NewCounterInput,
  type PendingUndo,
  type ThemeApi,
} from './context'
import { reducer } from './reducer'

const UNDO_WINDOW_MS = 4200
const SAVE_DEBOUNCE_MS = 150

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Stored state is rolled forward before the first render, so a counter last
  // touched yesterday never flashes its stale value.
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    reducer(load(), { type: 'rollover', today: todayKey() }),
  )
  const [today, setToday] = useState(todayKey)
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null)

  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef(state)

  useEffect(() => {
    latest.current = state
  }, [state])

  // --- persistence ---------------------------------------------------

  useEffect(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(state), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(saveTimer.current)
  }, [state])

  useEffect(() => {
    // A backgrounded tab may never get another frame; flush before it goes away.
    const flush = () => {
      if (document.visibilityState === 'hidden') {
        clearTimeout(saveTimer.current)
        save(latest.current)
      }
    }
    document.addEventListener('visibilitychange', flush)
    return () => document.removeEventListener('visibilitychange', flush)
  }, [])

  // --- midnight rollover ---------------------------------------------

  const runRollover = useCallback(() => {
    const now = todayKey()
    setToday(now)
    dispatch({ type: 'rollover', today: now })
  }, [])

  useEffect(() => {
    // Re-armed after each firing: a phone left open overnight still rolls over.
    let timer: ReturnType<typeof setTimeout>
    const arm = () => {
      timer = setTimeout(() => {
        runRollover()
        arm()
      }, msUntilNextMidnight() + 500)
    }
    arm()

    // And a device that was asleep catches up the moment it comes back.
    const onVisible = () => {
      if (document.visibilityState === 'visible') runRollover()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [runRollover])

  useEffect(() => () => clearTimeout(undoTimer.current), [])

  // --- counters api ---------------------------------------------------

  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimer.current)
    setPendingUndo(null)
  }, [])

  const counters = useMemo(
    () => [...state.counters].sort((a, b) => a.order - b.order),
    [state.counters],
  )

  const countersApi = useMemo<CountersApi>(() => {
    return {
      counters,
      today,
      getCounter: (id) => counters.find((c) => c.id === id),
      addCounter: (input: NewCounterInput) => {
        const id = newId()
        dispatch({ type: 'add', id, input, today: todayKey() })
        return id
      },
      updateCounter: (id, input) => dispatch({ type: 'update', id, input }),
      removeCounter: (id) => {
        dismissUndo()
        dispatch({ type: 'remove', id })
      },
      bump: (id, delta, day) => dispatch({ type: 'bump', id, delta, today: todayKey(), day }),
      reset: (id, day) => {
        const counter = counters.find((c) => c.id === id)
        if (!counter) return
        const target = day ?? today
        dispatch({ type: 'setValue', id, value: 0, today: todayKey(), day: target })
        clearTimeout(undoTimer.current)
        setPendingUndo({ id, name: counter.name, value: valueOn(counter, target, today), day: target })
        undoTimer.current = setTimeout(() => setPendingUndo(null), UNDO_WINDOW_MS)
      },
      pendingUndo,
      undoReset: () => {
        if (!pendingUndo) return
        dispatch({ type: 'setValue', id: pendingUndo.id, value: pendingUndo.value, today: todayKey(), day: pendingUndo.day })
        dismissUndo()
      },
      dismissUndo,
    }
  }, [counters, today, pendingUndo, dismissUndo])

  // --- theme ----------------------------------------------------------

  const choice = state.settings.theme
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' =
    choice === 'system' ? (systemDark ? 'dark' : 'light') : choice

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    // Keep the status bar in step with a theme the user pinned against the OS.
    const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][data-scheme]')
    for (const meta of metas) {
      const scheme = meta.dataset.scheme
      meta.media =
        choice === 'system'
          ? `(prefers-color-scheme: ${scheme})`
          : scheme === resolved
            ? 'all'
            : 'not all'
    }
  }, [resolved, choice])

  const themeApi = useMemo<ThemeApi>(
    () => ({
      choice,
      resolved,
      setChoice: (theme: ThemeChoice) => dispatch({ type: 'theme', theme }),
    }),
    [choice, resolved],
  )

  return (
    <ThemeContext.Provider value={themeApi}>
      <CountersContext.Provider value={countersApi}>{children}</CountersContext.Provider>
    </ThemeContext.Provider>
  )
}
