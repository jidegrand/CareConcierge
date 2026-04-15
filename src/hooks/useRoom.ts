import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Room } from '@/types'

interface UseRoomResult {
  room: Room | null
  loading: boolean
  error: string | null
}

export function useRoom(roomId: string | undefined): UseRoomResult {
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!roomId) {
      setError('No room ID provided.')
      setLoading(false)
      return
    }

    const fetchRoom = async () => {
      const { data, error: err } = await supabase
        .from('rooms')
        .select(`
          *,
          unit:units (
            *,
            site:sites (
              *,
              tenant:tenants (*)
            )
          )
        `)
        .eq('id', roomId)
        .eq('active', true)
        .single()

      if (err || !data) {
        setError('Room not found. Please ask a staff member for assistance.')
      } else {
        setRoom(data as Room)
      }
      setLoading(false)
    }

    fetchRoom()
  }, [roomId])

  return { room, loading, error }
}
