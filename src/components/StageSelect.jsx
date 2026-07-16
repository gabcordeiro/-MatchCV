import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { STAGES, stageById } from '../lib/stages.js'

// Seletor de etapa custom (substitui o <select> nativo). O menu é renderizado
// via portal no <body> e posicionado de forma fixa a partir do botão — assim
// não é cortado pelo overflow das colunas do kanban nem por scroll containers.
// Chama e.stopPropagation() para não disparar o clique/arraste do card.
export default function StageSelect({ value, onChange, size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const current = stageById(value)

  function place() {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const width = 180
    const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
    setPos({ top: r.bottom + 6, left })
  }

  function toggle(e) {
    e.stopPropagation()
    if (!open) place()
    setOpen((o) => !o)
  }

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    function close() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDoc)
    document.addEventListener('keydown', onKey)
    // Fecha ao rolar (a posição fixa ficaria defasada) ou redimensionar.
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  function pick(e, id) {
    e.stopPropagation()
    setOpen(false)
    if (id !== value) onChange(id)
  }

  const btnSize = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-sm'

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
        title="Mudar etapa"
        className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white font-medium text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700 ${btnSize}`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current.dot}`} />
        <span className="whitespace-nowrap">
          {current.emoji} {current.label}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: 180 }}
            className="animate-cardin z-50 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {STAGES.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={(e) => pick(e, s.id)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                    s.id === value ? 'font-semibold text-brand-700' : 'text-slate-600'
                  }`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                  <span className="flex-1 whitespace-nowrap">
                    {s.emoji} {s.label}
                  </span>
                  {s.id === value && <span className="text-brand-600">✓</span>}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  )
}
