const PRESENCE_COLORS = {
  'On Queue':  '#00c896',
  'Available': '#00c896',
  'Away':      '#f5a623',
  'Busy':      '#ff3b30',
  'Break':     '#f5a623',
  'Offline':   'rgba(255,255,255,0.3)',
}

export default function PresencePicker({ definitions, current, onChange }) {
  return (
    <div className="glass rounded-xl overflow-hidden shadow-2xl">
      {definitions.map((def) => {
        const color = PRESENCE_COLORS[def.name] || 'rgba(255,255,255,0.3)'
        const isActive = def.id === current?.id
        return (
          <button
            key={def.id}
            onClick={() => onChange(def)}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-left transition-colors hover:bg-white/5"
            style={isActive ? { background: 'rgba(99,153,255,0.1)' } : {}}
          >
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
            <span className="flex-1">{def.name}</span>
            {isActive && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
