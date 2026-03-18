'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react'

interface CsvFormatGuideProps {
  defaultOpen?: boolean
}

export function CsvFormatGuide({ defaultOpen = false }: CsvFormatGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-bg-border bg-bg-surface overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-border/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="h-5 w-5 text-text-muted" />
          <span className="text-sm font-medium text-text-base">
            CSV Format Guide
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-text-muted" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-sm text-text-muted">
            Upload CSV files with columns that match the patterns below. Column names are matched case-insensitively.
          </p>

          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-text-base mb-2">
                Experience
              </h4>
              <div className="text-xs text-text-muted space-y-1">
                <p><code className="text-accent">bullet</code> or <code className="text-accent">responsibility</code> or <code className="text-accent">description</code> (required)</p>
                <p><code className="text-text-muted">company</code>, <code className="text-text-muted">job title</code>, <code className="text-text-muted">category</code> (optional)</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-text-base mb-2">
                Summary
              </h4>
              <div className="text-xs text-text-muted space-y-1">
                <p><code className="text-accent">summary</code> or <code className="text-accent">intro</code> or <code className="text-accent">about me</code> (required)</p>
                <p><code className="text-text-muted">job title</code>, <code className="text-text-muted">category</code> (optional)</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-text-base mb-2">
                Skills
              </h4>
              <div className="text-xs text-text-muted space-y-1">
                <p><code className="text-accent">skill</code> or <code className="text-accent">tech</code> or <code className="text-accent">tool</code> (required)</p>
                <p><code className="text-text-muted">job title</code>, <code className="text-text-muted">category</code> (optional)</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-text-base mb-2">
                Tip
              </h4>
              <p className="text-xs text-text-muted">
                Use <code className="text-accent">category</code> in format <code className="text-text-muted">&quot;Job Title - Company&quot;</code> to auto-split into job_title and company.
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-text-base mb-2">
              Example
            </h4>
            <div className="rounded bg-bg-border p-3 overflow-x-auto">
              <pre className="text-xs text-text-muted whitespace-pre">
{`category,bullet
Software Engineer - Google,"Led team of 5 engineers building cloud infrastructure"
Data Scientist - Meta,"Developed ML models processing 1M+ daily predictions"
"",Python (skill)
"",React (skill)`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
