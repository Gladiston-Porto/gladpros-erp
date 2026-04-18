import { useState, useCallback } from 'react'

/**
 * Hook for managing boolean toggle state
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue)

  const toggle = useCallback(() => {
    setValue(prev => !prev)
  }, [])

  const setTrue = useCallback(() => {
    setValue(true)
  }, [])

  const setFalse = useCallback(() => {
    setValue(false)
  }, [])

  const set = useCallback((newValue: boolean) => {
    setValue(newValue)
  }, [])

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    set
  }
}