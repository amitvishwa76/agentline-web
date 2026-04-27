import { useState } from 'react'
import { buildScreenPopRows } from '../config/screenPopConfig.js'

export default function ScreenPopCard({ attributes = {}, title = 'Customer Details', defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  // Use the same buildScreenPopRows helper as mobile — only configured fields shown
  const rows = buildScreenPopRows(attributes)

  if (!rows.length) return null

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(s => !s)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium"
      >
        <span>{title}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0 px-4 pb-4">
            {rows.map((row, i) => (
              <div key={i} className="pt-3">
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </div>
                <div className="text-sm font-medium truncate">{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
