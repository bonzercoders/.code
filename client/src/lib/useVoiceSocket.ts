import { useCallback, useEffect, useRef, useState } from "react"

import { type ConnectionStatus, VoiceSocket, getWebSocketUrl } from "./websocket"

interface UseVoiceSocketOptions {
  onText?: (data: Record<string, unknown>) => void
  onBinary?: (data: ArrayBuffer) => void
}

export function useVoiceSocket(options: UseVoiceSocketOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const socketRef = useRef<VoiceSocket | null>(null)
  const handlersRef = useRef<UseVoiceSocketOptions>(options)

  useEffect(() => {
    handlersRef.current = options
  }, [options])

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

  const sendText = useCallback((data: Record<string, unknown>) => {
    socketRef.current?.sendText(data)
  }, [])

  const sendBinary = useCallback((data: ArrayBuffer | Uint8Array) => {
    socketRef.current?.sendBinary(data)
  }, [])

  return { status, sendText, sendBinary }
}
