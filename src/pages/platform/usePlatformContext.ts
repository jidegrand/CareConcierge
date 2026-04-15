import { useOutletContext } from 'react-router-dom'
import type { PlatformOutletContext } from '@/pages/platform/PlatformLayout'

export function usePlatformContext() {
  return useOutletContext<PlatformOutletContext>()
}
