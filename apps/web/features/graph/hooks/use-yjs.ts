"use client"

import { useEffect, useRef, useState } from "react"
import * as Y from "yjs"
import { WebsocketProvider } from "y-websocket"

const WS_URL = process.env.NEXT_PUBLIC_YJS_WS_URL || "ws://localhost:4000"

type UseYjsReturn = {
  doc: Y.Doc | null
  provider: WebsocketProvider | null
  synced: boolean
  connected: boolean
}

export function useYjs(room: string): UseYjsReturn {
  const docRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const [synced, setSynced] = useState(false)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const doc = new Y.Doc()
    const provider = new WebsocketProvider(WS_URL, room, doc, {
      connect: true,
    })

    docRef.current = doc
    providerRef.current = provider

    provider.on("sync", (isSynced: boolean) => {
      setSynced(isSynced)
    })
    provider.on("status", ({ status }: { status: string }) => {
      setConnected(status === "connected")
    })

    return () => {
      provider.destroy()
      doc.destroy()
    }
  }, [room])

  return {
    doc: docRef.current,
    provider: providerRef.current,
    synced,
    connected,
  }
}
