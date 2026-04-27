const KEYS = [
  ['1','',''], ['2','ABC',''], ['3','DEF',''],
  ['4','GHI',''], ['5','JKL',''], ['6','MNO',''],
  ['7','PQRS',''], ['8','TUV',''], ['9','WXYZ',''],
  ['*','',''], ['0','+',''], ['#','',''],
]

export default function Dialpad({ onKey, onBackspace }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map(([digit, letters]) => (
        <button
          key={digit}
          onClick={() => onKey?.(digit)}
          className="flex flex-col items-center justify-center rounded-xl py-3.5 transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        >
          <span className="text-lg font-semibold leading-none">{digit}</span>
          {letters && (
            <span className="text-xs mt-0.5 tracking-widest"
              style={{ color: 'var(--text-secondary)', fontSize: '9px' }}>
              {letters}
            </span>
          )}
        </button>
      ))}

      {/* Bottom row: empty | 0 already covered | backspace */}
      <button
        onClick={onBackspace}
        className="col-start-3 flex items-center justify-center rounded-xl py-3.5 transition-all active:scale-95"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)' }}
        aria-label="Backspace"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21 12H9M9 12l4-4M9 12l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M3.34 7A10 10 0 1020.66 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0" />
          <path d="M22 3L2 3" stroke="none" />
          <path d="M21 4H9.414a1 1 0 00-.707.293L3 10l5.707 5.707A1 1 0 009.414 16H21a1 1 0 001-1V5a1 1 0 00-1-1z"
            fill="rgba(255,255,255,0.1)" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  )
}
