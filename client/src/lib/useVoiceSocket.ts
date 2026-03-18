import { useEffect, useRef, useState } from "react"

import { type ConnectionStatus, VoiceSocket, getWebSocketUrl } from "./websocket"

interface UseVoiceSocketOptions {
  onText?: (data: Record<string, unknown>) => void
  onBinary?: (data: ArrayBuffer) => void
}

const noop = () => {}

export function useVoiceSocket(options: UseVoiceSocketOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const socketRef = useRef<VoiceSocket | null>(null)
  const handlersRef = useRef(options)
  handlersRef.current = options

  useEffect(() => {
    const socket = new VoiceSocket({
      url: getWebSocketUrl(),
      onText: (data) => handlersRef.current.onText?.(data),
      onBinary: (data) => handlersRef.current.onBinary?.(data),
      onStatusChange: setStatus,
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  return { status, socket: socketRef }
}
