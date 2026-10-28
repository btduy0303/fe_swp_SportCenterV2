import { useToast } from '../../context/ToastContext'

export function useTrainingToast() {
  const toast = useToast()
  return {
    success: message => toast.success(message, { variant: 'training' }),
    error: message => toast.error(message, { variant: 'training' }),
    info: message => toast.info(message, { variant: 'training' }),
  }
}
