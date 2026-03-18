'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sparkles, Send, Check, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'

interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

interface QueueItem {
  id: string
  raw_text: string
  company_name: string | null
  job_title: string | null
}

interface ChatPanelProps {
  item: QueueItem | null
  chat: ChatTurn[]
  loading: boolean
  onSend: (msg: string) => void
  onConfirm: () => void
  onSkip: () => void
  input: string
  onInputChange: (val: string) => void
}

export function ChatPanel({
  item,
  chat,
  loading,
  onSend,
  onConfirm,
  onSkip,
  input,
  onInputChange,
}: ChatPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input)
      onInputChange('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg-app">
        <Sparkles className="h-16 w-16 text-accent opacity-20 mb-4" />
        <p className="text-text-muted">Select an experience entry to begin</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-app">
      {/* Header */}
      <div className="flex gap-6 p-4 border-b border-bg-border bg-bg-surface">
        <div className="flex-1">
          <p className="text-xs text-text-muted mb-1">Original</p>
          <div className="p-3 bg-bg-app rounded-lg border border-bg-border text-sm text-text-base max-h-24 overflow-y-auto">
            {item.raw_text}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-xs text-text-muted mb-1">Company</p>
            <span className="inline-block px-3 py-1 bg-accent-muted text-accent rounded-full text-sm">
              {item.company_name || 'Unknown'}
            </span>
          </div>
          {item.job_title && (
            <div>
              <p className="text-xs text-text-muted mb-1">Role</p>
              <Badge variant="default">{item.job_title}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chat.map((turn, idx) => (
          <div
            key={idx}
            className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-xl px-4 py-2 text-sm
                ${
                  turn.role === 'user'
                    ? 'bg-accent text-white whitespace-pre-wrap'
                    : 'bg-bg-surface text-text-base border border-bg-border'
                }
              `}
            >
              {turn.role === 'assistant' ? (
                <div className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {turn.content}
                  </ReactMarkdown>
                </div>
              ) : (
                turn.content
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-bg-surface rounded-xl px-4 py-2 border border-bg-border">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-bg-border bg-bg-surface space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-1 bg-bg-app border border-bg-border rounded-lg px-4 py-2 text-sm text-text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
          <Button onClick={handleSend} disabled={!input.trim() || loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 justify-end">
          <Tooltip content="Saves the rewritten sentence and extracted fields to your claims library.">
            <Button
              variant="success"
              onClick={onConfirm}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-2" />
              Confirm & Save
            </Button>
          </Tooltip>
          <Button variant="ghost" onClick={onSkip} disabled={loading}>
            <SkipForward className="h-4 w-4 mr-2" />
            Skip
          </Button>
        </div>
      </div>
    </div>
  )
}
