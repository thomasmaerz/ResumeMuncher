'use client'

import { CheckCircle, AlertCircle } from 'lucide-react'

interface QueueItem {
  id: string
  source_resume_id: string
  raw_text: string
  company_name: string | null
  job_title: string | null
}

interface QueuePanelProps {
  items: QueueItem[] | { error?: string }
  selectedId: string | null
  onSelect: (item: QueueItem) => void
  loading: boolean
}

export function QueuePanel({
  items,
  selectedId,
  onSelect,
  loading,
}: QueuePanelProps) {
  const isArray = Array.isArray(items)
  const itemList = isArray ? items : []
  const hasError = !isArray || ('error' in items && !!items.error)

  return (
    <div className="w-80 h-full bg-bg-surface border-r border-bg-border flex flex-col">
      <div className="p-4 border-b border-bg-border">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-text-base">Experience Queue</h2>
          <span className="text-xs bg-accent-muted text-accent px-2 py-1 rounded-full">
            {isArray ? itemList.length : '?'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-text-muted">Failed to load queue</p>
            <p className="text-xs text-text-muted mt-1">
              {!isArray && 'error' in items ? items.error : 'Please check your connection'}
            </p>
          </div>
        ) : itemList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-text-muted">All caught up</p>
          </div>
        ) : (
          <div className="divide-y divide-bg-border">
            {itemList.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`
                  w-full text-left p-4 transition-all duration-200
                  ${
                    selectedId === item.id
                      ? 'bg-accent-muted border-l-2 border-accent'
                      : 'hover:bg-bg-app/50 border-l-2 border-transparent'
                  }
                `}
              >
                <p className="font-semibold text-accent text-sm truncate">
                  {item.company_name || 'Unknown'}
                </p>
                {item.job_title && (
                  <p className="text-xs text-text-muted italic truncate">
                    {item.job_title}
                  </p>
                )}
                <p className="text-xs text-text-muted mt-1 line-clamp-2">
                  {item.raw_text}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
