import { useState } from 'react'

type ToastType = 'default' | 'destructive' | 'success'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: ToastType
}

interface ToastOptions {
  title?: string
  description?: string
  variant?: ToastType
}

let toastCount = 0

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = ({ title, description, variant = 'default' }: ToastOptions) => {
    const id = (++toastCount).toString()
    const newToast: Toast = {
      id,
      title,
      description,
      variant,
    }

    setToasts(prev => [...prev, newToast])

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)

    return {
      id,
      dismiss: () => setToasts(prev => prev.filter(t => t.id !== id)),
      update: (newOptions: ToastOptions) => {
        setToasts(prev => prev.map(t => 
          t.id === id 
            ? { ...t, ...newOptions }
            : t
        ))
      }
    }
  }

  const dismiss = (toastId?: string) => {
    if (toastId) {
      setToasts(prev => prev.filter(t => t.id !== toastId))
    } else {
      setToasts([])
    }
  }

  return {
    toast,
    dismiss,
    toasts
  }
}

export type { Toast, ToastOptions }
