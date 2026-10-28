import React, { createContext, useContext, useState, useCallback } from 'react'
import styles from '../css/common/Toast.module.css'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info', duration = 4000, variant) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type, variant }])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = {
    success: (msg, options) => addToast(msg, 'success', 4000, options?.variant),
    error: (msg, options) => addToast(msg, 'error', 4000, options?.variant),
    info: (msg, options) => addToast(msg, 'info', 4000, options?.variant),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className={styles.toastContainer} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} data-variant={t.variant} className={`${styles.toast} ${styles[t.type] || styles.info}`}>
            <div className={styles.toastContent}>
              <span className={t.type === 'success' ? styles.badgeSuccess : t.type === 'error' ? styles.badgeError : styles.badgeInfo}>
                {t.type === 'success' ? '✓' : t.type === 'error' ? '!' : 'i'}
              </span>
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={() => removeToast(t.id)}
              aria-label="Đóng thông báo"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      info: (msg) => console.log('Toast info:', msg),
    }
  }
  return context
}
