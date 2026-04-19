import { useState, useEffect, useRef } from 'react'

export default function Autocomplete({ value, onChange, options, loading, placeholder, disabled, openZIndex = 20 }) {
    const [query, setQuery] = useState(value ?? '')
    const [open, setOpen]   = useState(false)
    const containerRef      = useRef(null)

    useEffect(() => { setQuery(value ?? '') }, [value])

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const filtered = query.length >= 1
        ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
        : options

    const select = (val) => { setQuery(val); onChange(val); setOpen(false) }

    return (
        <div ref={containerRef} className="relative" style={{ zIndex: open ? openZIndex : 'auto' }}>
            <input
                type="text"
                className="form-control"
                placeholder={placeholder}
                value={query}
                disabled={disabled}
                onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
            />
            {loading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Loading…</span>
            )}
            {open && !loading && filtered.length > 0 && (
                <ul
                    className="absolute w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1"
                    style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {filtered.map(opt => (
                        <li
                            key={opt}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-violet-50 hover:text-violet-700"
                            onMouseDown={() => select(opt)}>
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
