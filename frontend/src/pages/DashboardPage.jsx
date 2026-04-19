import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { generateSuggestions, getSuggestions, dismissSuggestion } from '../api/matchApi'
import { sendFriendRequest } from '../api/friendshipApi'
import { getEvents } from '../api/eventApi'
import { getTrips } from '../api/tripApi'

const JOB_TYPE_LABELS = {
    HOTEL: 'Hotel', RESORT: 'Resort', AMUSEMENT_PARK: 'Amusement Park',
    RESTAURANT: 'Restaurant', CAFE: 'Cafe', RETAIL: 'Retail',
    CAMP: 'Camp', BEACH_CLUB: 'Beach Club', GOLF_COURSE: 'Golf Course',
    WAREHOUSE: 'Warehouse', OTHER: 'Other',
}

function ScoreBar({ score }) {
    const pct = Math.round(score ?? 0)
    const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626'
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color }}>{pct}%</span>
        </div>
    )
}

function Avatar({ photoUrl, name, size = 'md' }) {
    const dim = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm'
    const initials = (name || '?').slice(0, 1).toUpperCase()
    return (
        <div className={`${dim} rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
            {photoUrl
                ? <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                : <span className="font-bold text-violet-600">{initials}</span>
            }
        </div>
    )
}

function SectionHeader({ title, to, linkLabel = 'View all' }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            {to && (
                <Link to={to} className="text-sm text-violet-600 hover:underline font-medium no-underline">
                    {linkLabel} →
                </Link>
            )}
        </div>
    )
}

// ── Friend suggestion card ────────────────────────────────────────────────────
function SuggestionCard({ suggestion, onDismiss, onAdd }) {
    const [added, setAdded]       = useState(false)
    const [loading, setLoading]   = useState(false)
    const [error, setError]       = useState('')

    const handleAdd = async () => {
        setLoading(true)
        setError('')
        try {
            await onAdd(suggestion.suggestedUserId)
            setAdded(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send request')
        } finally {
            setLoading(false)
        }
    }

    const handleDismiss = async () => {
        setLoading(true)
        try { await onDismiss(suggestion.id) }
        finally { setLoading(false) }
    }

    const subtitle = [
        suggestion.jobType ? JOB_TYPE_LABELS[suggestion.jobType] : null,
        suggestion.jobCity,
    ].filter(Boolean).join(' · ')

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3 min-w-[220px] max-w-[240px] flex-shrink-0">
            <div className="flex items-center gap-3">
                <Avatar photoUrl={suggestion.profilePhotoUrl} name={suggestion.suggestedFullName || suggestion.suggestedUsername} size="lg" />
                <div className="min-w-0">
                    <Link
                        to={`/profile/${suggestion.suggestedUserId}`}
                        className="font-semibold text-sm text-gray-900 hover:text-violet-700 no-underline leading-tight block truncate">
                        {suggestion.suggestedFullName || suggestion.suggestedUsername}
                    </Link>
                    <p className="text-xs text-gray-400 truncate">@{suggestion.suggestedUsername}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
                </div>
            </div>

            <ScoreBar score={suggestion.compatibilityScore} />

            {suggestion.reason && (
                <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-700">Why:</span> {suggestion.reason}
                </p>
            )}

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 mt-auto">
                {added ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">✓ Request sent</span>
                ) : (
                    <button
                        className="btn btn-primary btn-sm flex-1"
                        disabled={loading}
                        onClick={handleAdd}>
                        Add Friend
                    </button>
                )}
                <button
                    className="btn btn-sm border border-gray-200 text-gray-500 hover:bg-gray-50"
                    disabled={loading}
                    onClick={handleDismiss}>
                    ✕
                </button>
            </div>
        </div>
    )
}

// ── Mini event card ───────────────────────────────────────────────────────────
function EventCard({ event }) {
    return (
        <Link to={`/events?open=${event.id}`} className="no-underline block">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-violet-200 hover:shadow-md transition-all cursor-pointer">
                <p className="font-semibold text-sm text-gray-900 truncate mb-1">{event.title}</p>
                {event.location && <p className="text-xs text-gray-500 truncate mb-1">{event.location}</p>}
                <p className="text-xs text-gray-400">{new Date(event.eventDate).toLocaleDateString()}</p>
                {event.maxParticipants != null && (
                    <p className="text-xs text-gray-400 mt-1">
                        {event.maxParticipants - (event.participantCount || 0)} spot{event.maxParticipants - (event.participantCount || 0) !== 1 ? 's' : ''} left
                    </p>
                )}
            </div>
        </Link>
    )
}

// ── Mini trip card ────────────────────────────────────────────────────────────
function TripCard({ trip }) {
    const dates = trip.startDate && trip.endDate
        ? `${new Date(trip.startDate).toLocaleDateString()} – ${new Date(trip.endDate).toLocaleDateString()}`
        : null
    return (
        <Link to={`/trips?open=${trip.id}`} className="no-underline block">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-violet-200 hover:shadow-md transition-all cursor-pointer">
                <p className="font-semibold text-sm text-gray-900 truncate mb-1">{trip.title}</p>
                {trip.destination && <p className="text-xs text-gray-500 truncate mb-1">{trip.destination}</p>}
                {dates && <p className="text-xs text-gray-400">{dates}</p>}
                {trip.maxMembers != null && (
                    <p className="text-xs text-gray-400 mt-1">
                        {trip.maxMembers - (trip.memberCount || 0)} spot{trip.maxMembers - (trip.memberCount || 0) !== 1 ? 's' : ''} left
                    </p>
                )}
            </div>
        </Link>
    )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardPage() {
    const { user } = useAuth()

    const [suggestions, setSuggestions] = useState([])
    const [events,      setEvents]      = useState([])
    const [trips,       setTrips]       = useState([])
    const [loading,     setLoading]     = useState(true)

    const isAdmin = user?.role === 'ADMIN'

    useEffect(() => {
        const load = async () => {
            const [eventsRes, tripsRes] = await Promise.allSettled([
                getEvents(0, 3),
                getTrips(0, 3),
            ])

            if (eventsRes.status === 'fulfilled')  setEvents(eventsRes.value.content ?? [])
            if (tripsRes.status === 'fulfilled')   setTrips(tripsRes.value.content ?? [])

            if (!isAdmin) {
                try { await generateSuggestions() } catch { /* ignore */ }
                try {
                    const fresh = await getSuggestions(0, 8)
                    setSuggestions(fresh.content ?? [])
                } catch { /* ignore */ }
            }

            setLoading(false)
        }
        load().catch(() => setLoading(false))
    }, [])

    const handleDismiss = async (id) => {
        await dismissSuggestion(id)
        setSuggestions(prev => prev.filter(s => s.id !== id))
    }

    const handleAdd = async (addresseeId) => {
        await sendFriendRequest(addresseeId)
    }

    if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>

    return (
        <div className="max-w-5xl mx-auto py-6 px-4 space-y-10">

            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.username} 👋</h1>
                <p className="text-gray-500 text-sm mt-1">Here's what's happening on WTBuddy.</p>
            </div>

            {/* Friend suggestions — hidden for admin */}
            {!isAdmin && (
                <section>
                    <SectionHeader title="Friends suggestions" />
                    {suggestions.length === 0 ? (
                        <p className="text-gray-400 text-sm">No suggestions right now — check back after more users join!</p>
                    ) : (
                        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                            {suggestions.map(s => (
                                <SuggestionCard
                                    key={s.id}
                                    suggestion={s}
                                    onDismiss={handleDismiss}
                                    onAdd={handleAdd}
                                />
                            ))}
                        </div>
                    )}
                </section>
            )}

            {/* Events */}
            <section>
                <SectionHeader title="Upcoming Events" to="/events" />
                {events.length === 0 ? (
                    <p className="text-gray-400 text-sm">No events yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map(e => <EventCard key={e.id} event={e} />)}
                    </div>
                )}
            </section>

            {/* Trips */}
            <section>
                <SectionHeader title="Active Trips" to="/trips" />
                {trips.length === 0 ? (
                    <p className="text-gray-400 text-sm">No trips yet.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {trips.map(t => <TripCard key={t.id} trip={t} />)}
                    </div>
                )}
            </section>

        </div>
    )
}

export default DashboardPage
