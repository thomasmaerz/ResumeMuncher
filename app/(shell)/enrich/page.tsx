'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { QueuePanel } from '@/components/enrich/QueuePanel'
import { ChatPanel } from '@/components/enrich/ChatPanel'
import { Message } from '@/lib/ai'

interface QueueItem {
  id: string
  source_resume_id: string
  raw_text: string
  company_name: string | null
  job_title: string | null
}

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export default function EnrichPage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [selected, setSelected] = useState<QueueItem | null>(null)
  const [chat, setChat] = useState<ChatTurn[]>([])
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Context for enrichment agent
  const [contextSkills, setContextSkills] = useState<string[]>([])
  const [contextJobTitles, setContextJobTitles] = useState<string[]>([])
  const [contextResumeId, setContextResumeId] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/enrich/queue', { cache: 'no-store' })
      const data = await res.json()
      setQueue(data)
    } catch (error) {
      console.error('Failed to fetch queue:', error)
    }
  }, [])

  const fetchContext = useCallback(async (resumeId?: string) => {
    const supabase = createClient()

    let skillsQuery = supabase.from('rmc_skills').select('skill')
    if (resumeId) {
      skillsQuery = skillsQuery.contains('source_resume_ids', [resumeId])
    }

    let titlesQuery = supabase
      .from('rmc_experience_staging')
      .select('job_title')
      .not('job_title', 'is', null)

    if (resumeId) {
      titlesQuery = titlesQuery.eq('source_resume_id', resumeId)
    }

    const [skillsRes, stagingRes] = await Promise.all([skillsQuery, titlesQuery])

    if (skillsRes.data) {
      setContextSkills(skillsRes.data.map((s: any) => s.skill))
    }

    if (stagingRes.data) {
      const uniqueTitles = [
        ...new Set(
          stagingRes.data
            .map((r: any) => r.job_title)
            .filter(Boolean) as string[]
        ),
      ]
      setContextJobTitles(uniqueTitles)
    }
    setContextResumeId(resumeId || 'global')
  }, [])

  // Fetch global context on mount
  useEffect(() => {
    fetchContext()
  }, [fetchContext])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // Auto-select first item when queue loads
  useEffect(() => {
    if (queue.length > 0 && !selected) {
      selectItem(queue[0])
    }
  }, [queue, selected])

  const selectItem = async (item: QueueItem) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    setSelected(item)
    setChat([{ role: 'assistant', content: '' }])
    setConversationHistory([])
    setInput('')
    setAiLoading(true)

    try {
      // If we don't have context for this resume yet, fetch it
      if (item.source_resume_id !== contextResumeId) {
        await fetchContext(item.source_resume_id)
      }

      const body: Record<string, any> = { 
        stagingId: item.id,
        rawText: item.raw_text
      }

      // Pass context on first turn
      if (contextSkills.length > 0 || contextJobTitles.length > 0) {
        body.context = {}
        if (contextSkills.length > 0) {
          body.context.skills = contextSkills
        }
        if (contextJobTitles.length > 0) {
          body.context.jobTitles = contextJobTitles
        }
      }

      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal,
      })

      if (!res.ok) {
        if (res.status === 404) {
          console.warn('Staging item no longer exists, removing from queue')
          setQueue((prev) => prev.filter((i) => i.id !== item.id))
          setSelected(null)
          setChat([]) // Clear it if it failed
        }
        throw new Error(`Enrich request failed: ${res.status}`)
      }

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''

      let pendingText = ''
      let isStreaming = true

      const typeResponse = async () => {
        while ((isStreaming || pendingText.length > 0) && !signal.aborted) {
          if (pendingText.length === 0) {
            await new Promise((r) => setTimeout(r, 20))
            continue
          }

          const char = pendingText[0]
          pendingText = pendingText.slice(1)

          setChat((prev) => {
            const last = prev[prev.length - 1]
            if (!last || last.role !== 'assistant') return prev
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + char },
            ]
          })

          let delay = 9
          if (char === '\n') delay = 175
          else if (['.', '!', '?'].includes(char)) delay = 70
          else if ([',', ';', ':'].includes(char)) delay = 35

          await new Promise((r) => setTimeout(r, delay + Math.random() * 5))
        }
      }

      const typingPromise = typeResponse()

      while (!done && !signal.aborted) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        buffer += chunkValue

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'text') {
              pendingText += data.content
            } else if (data.type === 'history') {
              setConversationHistory(data.content)
            }
          } catch (e) {
            console.error('Failed to parse stream line:', e)
          }
        }
      }

      isStreaming = false
      await typingPromise
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Failed to start enrich:', error)
    } finally {
      if (!signal.aborted) {
        setAiLoading(false)
      }
    }
  }

  const handleSend = async (msg: string) => {
    if (!selected || !msg.trim()) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const userTurn: ChatTurn = { role: 'user', content: msg }
    setChat((prev) => [...prev, userTurn])
    setAiLoading(true)

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagingId: selected.id,
          conversationHistory,
          userMessage: msg,
        }),
        signal,
      })

      if (!res.ok) throw new Error(`Send failed: ${res.status}`)
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ''

      setChat((prev) => [...prev, { role: 'assistant', content: '' }])

      let pendingText = ''
      let isStreaming = true

      const typeResponse = async () => {
        while ((isStreaming || pendingText.length > 0) && !signal.aborted) {
          if (pendingText.length === 0) {
            await new Promise((r) => setTimeout(r, 20))
            continue
          }

          const char = pendingText[0]
          pendingText = pendingText.slice(1)

          setChat((prev) => {
            const last = prev[prev.length - 1]
            if (!last || last.role !== 'assistant') return prev
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + char },
            ]
          })

          let delay = 9
          if (char === '\n') delay = 175
          else if (['.', '!', '?'].includes(char)) delay = 70
          else if ([',', ';', ':'].includes(char)) delay = 35

          await new Promise((r) => setTimeout(r, delay + Math.random() * 5))
        }
      }

      const typingPromise = typeResponse()

      while (!done && !signal.aborted) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        buffer += chunkValue

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'text') {
              pendingText += data.content
            } else if (data.type === 'history') {
              setConversationHistory(data.content)
            }
          } catch (lineError) {
            console.error('Failed to parse stream line:', lineError)
          }
        }
      }

      isStreaming = false
      await typingPromise
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Failed to send message:', error)
    } finally {
      if (!signal.aborted) {
        setAiLoading(false)
      }
    }
  }

  const handleConfirm = async () => {
    if (!selected) return

    setAiLoading(true)

    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagingId: selected.id,
          conversationHistory,
          action: 'confirm',
          rawText: selected.raw_text
        }),
      })

      const data = await res.json()

      if (data.status === 'complete') {
        setChat((prev) => [
          ...prev,
          { role: 'assistant', content: 'Saved to your claims library.' },
        ])

        // Remove from queue and advance
        setTimeout(() => {
          setQueue((prev) => prev.filter((item) => item.id !== selected.id))
          setSelected(null)

          // Select next item
          const currentIndex = queue.findIndex((item) => item.id === selected.id)
          if (queue[currentIndex + 1]) {
            selectItem(queue[currentIndex + 1])
          } else if (queue.length > 1) {
            selectItem(queue[0])
          } else {
            fetchQueue()
          }
        }, 800)
      }
    } catch (error) {
      console.error('Failed to confirm:', error)
    } finally {
      setAiLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!selected) return

    // Optimistically remove from queue
    const prevSelected = selected
    setQueue((prev) => prev.filter((item) => item.id !== selected.id))
    setSelected(null)

    try {
      await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stagingId: prevSelected.id,
          action: 'skip',
          rawText: prevSelected.raw_text
        }),
      })

      // Select next item
      const currentIndex = queue.findIndex((item) => item.id === prevSelected.id)
      if (queue[currentIndex + 1]) {
        selectItem(queue[currentIndex + 1])
      } else if (queue.length > 1) {
        selectItem(queue[0])
      }
    } catch (error) {
      console.error('Failed to skip:', error)
    }
  }

  return (
    <div className="flex h-[calc(100vh-0px)] -m-8 overflow-hidden">
      <QueuePanel
        items={queue}
        selectedId={selected?.id || null}
        onSelect={selectItem}
        loading={aiLoading}
      />

      <ChatPanel
        item={selected}
        chat={chat}
        loading={aiLoading}
        onSend={handleSend}
        onConfirm={handleConfirm}
        onSkip={handleSkip}
        input={input}
        onInputChange={setInput}
      />
    </div>
  )
}
