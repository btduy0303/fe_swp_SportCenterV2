import { useEffect, useState } from 'react'
import { trainingRequest } from '../../services/trainingService'

export function useTrainingData(token, path, revision = 0) {
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    trainingRequest(token, path, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setState({ path, revision, token, loading: false, data, error: '' })
    }).catch(error => {
      if (!controller.signal.aborted) setState({ path, revision, token, loading: false, data: null, error: error.message, status: error.status })
    })
    return () => controller.abort()
  }, [token, path, revision])
  if (!path) return { loading: false, data: null, error: '' }
  return state.path === path && state.token === token && state.revision === revision ? state : { loading: true, data: null, error: '' }
}
