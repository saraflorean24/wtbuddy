import { useState, useEffect } from 'react'
import { submitFeedback, getAllFeedback } from '../api/feedbackApi'
import { useAuth } from '../context/useAuth'

const CATEGORIES = [
    { value: 'GENERAL',          label: 'General' },
    { value: 'BUG_REPORT',       label: 'Bug Report' },
    { value: 'FEATURE_REQUEST',  label: 'Feature Request' },
    { value: 'TRIP_EXPERIENCE',  label: 'Trip Experience' },
    { value: 'EVENT_EXPERIENCE', label: 'Event Experience' },
]

const TOPICS = ['Trips', 'Events', 'Notifications', 'Search', 'Profile', 'Other']

const RATINGS = [
    { value: 1, label: 'Very Unsatisfied' },
    { value: 2, label: 'Unsatisfied' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Satisfied' },
    { value: 5, label: 'Very Satisfied' },
]

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

function Stars({ rating, size = 'text-base' }) {
    return (
        <span className={`${size} text-amber-400`}>
            {'★'.repeat(rating)}
            <span className="text-gray-300">{'★'.repeat(5 - rating)}</span>
        </span>
    )
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
}

const EMPTY_FORM = { category: '', rating: '', topics: [], message: '' }

// ── Admin view ────────────────────────────────────────────────────────────────
function AdminFeedbackView() {
    const [items,      setItems]      = useState([])
    const [page,       setPage]       = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [loading,    setLoading]    = useState(false)

    useEffect(() => { load() }, [page])

    const load = async () => {
        setLoading(true)
        try {
            const data = await getAllFeedback(page, 12)
            setItems(data.content)
            setTotalPages(data.totalPages)
        } catch { /* silently fail */ }
        finally { setLoading(false) }
    }

    return (
        <div>
            <h3 className="text-base font-semibold mb-5 text-gray-700">
                All User Feedback
            </h3>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading…</div>
            ) : items.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">No feedback submitted yet.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(fb => (
                        <div key={fb.id} className="card p-5 flex flex-col gap-3">
                            {/* Stars */}
                            <Stars rating={fb.rating} />

                            {/* Message */}
                            {fb.message ? (
                                <p className="text-sm text-gray-700 flex-1 leading-relaxed">
                                    "{fb.message}"
                                </p>
                            ) : (
                                <p className="text-xs text-gray-400 italic flex-1">No message provided.</p>
                            )}

                            {/* Topics */}
                            {fb.topics?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {fb.topics.map(t => (
                                        <span key={t} className="badge badge-light text-[10px]">{t}</span>
                                    ))}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {fb.username?.[0]?.toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-gray-700">{fb.username}</span>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="badge badge-primary text-[10px]">{CATEGORY_LABEL[fb.category] ?? fb.category}</span>
                                    <span className="text-[10px] text-gray-400">{timeAgo(fb.createdAt)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center gap-1 justify-center mt-6">
                    <button className="page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button key={i} className={`page-btn ${page === i ? 'page-btn-active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
                    ))}
                    <button className="page-btn" disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
            )}
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────
function FeedbackPage() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'

    const [form,       setForm]       = useState(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [success,    setSuccess]    = useState(false)
    const [error,      setError]      = useState('')

    const toggleTopic = (topic) => {
        setForm(prev => ({
            ...prev,
            topics: prev.topics.includes(topic)
                ? prev.topics.filter(t => t !== topic)
                : [...prev.topics, topic],
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.category || !form.rating) { setError('Please fill in all required fields.'); return }
        setSubmitting(true); setError('')
        try {
            await submitFeedback({
                category: form.category,
                rating:   parseInt(form.rating),
                topics:   form.topics,
                message:  form.message || null,
            })
            setSuccess(true)
            setForm(EMPTY_FORM)
            setTimeout(() => setSuccess(false), 4000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit feedback.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={isAdmin ? '' : 'max-w-2xl mx-auto'}>
            <h2 className="text-2xl font-bold mb-6">Feedback</h2>

            <div className={isAdmin ? 'grid grid-cols-1 lg:grid-cols-3 gap-8 items-start' : ''}>

                {/* ── Form ── */}
                <div className={isAdmin ? 'lg:col-span-1' : ''}>
                    <div className="card mb-8">
                        <div className="p-6">
                            <h3 className="text-base font-semibold mb-5 text-gray-700">Share your experience</h3>

                            {success && (
                                <div className="bg-green-50 border border-green-200 text-green-700 rounded-md px-4 py-3 mb-5 text-sm">
                                    Thank you! Your feedback has been submitted.
                                </div>
                            )}
                            {error && (
                                <div className="alert alert-danger justify-between mb-4">
                                    <span>{error}</span>
                                    <button className="btn-close text-red-700" onClick={() => setError('')}>×</button>
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {/* SELECT */}
                                <div className="mb-5">
                                    <label className="form-label">Category *</label>
                                    <select className="form-select" value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })} required>
                                        <option value="">Select a category…</option>
                                        {CATEGORIES.map(c => (
                                            <option key={c.value} value={c.value}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* RADIO */}
                                <div className="mb-5">
                                    <label className="form-label">Overall Rating *</label>
                                    <div className="flex flex-col gap-2 mt-1">
                                        {RATINGS.map(r => (
                                            <label key={r.value} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="radio"
                                                    name="rating"
                                                    value={r.value}
                                                    checked={form.rating === String(r.value)}
                                                    onChange={e => setForm({ ...form, rating: e.target.value })}
                                                    className="w-4 h-4 accent-violet-600"
                                                />
                                                <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-violet-700">
                                                    <Stars rating={r.value} size="text-sm" />
                                                    {r.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* CHECKBOXES */}
                                <div className="mb-5">
                                    <label className="form-label">Areas (select all that apply)</label>
                                    <div className="flex flex-wrap gap-3 mt-1">
                                        {TOPICS.map(topic => (
                                            <label key={topic} className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={form.topics.includes(topic)}
                                                    onChange={() => toggleTopic(topic)}
                                                    className="w-4 h-4 accent-violet-600"
                                                />
                                                <span className="text-sm text-gray-700">{topic}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* TEXTAREA */}
                                <div className="mb-6">
                                    <label className="form-label">Message</label>
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        placeholder="Tell us more about your experience…"
                                        maxLength={2000}
                                        value={form.message}
                                        onChange={e => setForm({ ...form, message: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length}/2000</p>
                                </div>

                                <button type="submit" className="btn btn-primary btn-md w-full" disabled={submitting}>
                                    {submitting ? 'Submitting…' : 'Submit Feedback'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* ── Admin: all feedback ── */}
                {isAdmin && (
                    <div className="lg:col-span-2">
                        <AdminFeedbackView />
                    </div>
                )}
            </div>
        </div>
    )
}

export default FeedbackPage
