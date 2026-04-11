import { useState, useEffect } from 'react'
import { getNotifications, markAsRead, markAllAsRead } from '../api/notificationApi'

const TYPE_META = {
    TRIP_JOIN_REQUEST:   { icon: '🧳', color: 'primary',   label: 'Join Request' },
    TRIP_JOIN_ACCEPTED:  { icon: '✅', color: 'success',   label: 'Request Accepted' },
    TRIP_JOIN_DECLINED:  { icon: '❌', color: 'danger',    label: 'Request Declined' },
    FRIEND_REQUEST:      { icon: '🤝', color: 'info',      label: 'Friend Request' },
    FRIEND_ACCEPTED:     { icon: '👥', color: 'success',   label: 'Friend Accepted' },
    EVENT_INVITE:        { icon: '📅', color: 'warning',   label: 'Event Invite' },
    EVENT_REMINDER:      { icon: '⏰', color: 'warning',   label: 'Event Reminder' },
    TRIP_INVITE:         { icon: '✈️', color: 'primary',  label: 'Trip Invite' },
    MATCH_SUGGESTION:    { icon: '💡', color: 'secondary', label: 'Match Suggestion' },
    EVENT_JOIN_REQUEST:  { icon: '🎫', color: 'primary',  label: 'Event Join Request' },
    EVENT_JOIN_ACCEPTED: { icon: '✅', color: 'success',  label: 'Event Request Accepted' },
    EVENT_JOIN_DECLINED: { icon: '❌', color: 'danger',   label: 'Event Request Declined' },
}

const COLOR_CLASSES = {
    primary:   { iconBg: 'bg-violet-100',  badgeBg: 'bg-violet-600 text-white' },
    success:   { iconBg: 'bg-green-100',   badgeBg: 'bg-green-600 text-white' },
    danger:    { iconBg: 'bg-red-100',     badgeBg: 'bg-red-600 text-white' },
    warning:   { iconBg: 'bg-amber-100',   badgeBg: 'bg-amber-500 text-white' },
    secondary: { iconBg: 'bg-gray-100',    badgeBg: 'bg-gray-500 text-white' },
    info:      { iconBg: 'bg-sky-100',     badgeBg: 'bg-sky-500 text-white' },
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
}

function NotificationsPage() {
    const [notifications, setNotifications] = useState([])
    const [totalPages,    setTotalPages]    = useState(0)
    const [currentPage,   setCurrentPage]   = useState(0)
    const [loading,       setLoading]       = useState(false)
    const [filter,        setFilter]        = useState('all')

    useEffect(() => { fetchNotifications() }, [currentPage])

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const data = await getNotifications(currentPage, 20)
            setNotifications(data.content)
            setTotalPages(data.totalPages)
        } catch { /* silently fail */ }
        finally { setLoading(false) }
    }

    const handleMarkRead = async (id) => {
        await markAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    }

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    }

    const displayed = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications
    const unreadCount = notifications.filter(n => !n.isRead).length

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold m-0">Notifications</h2>
                    {unreadCount > 0 && (
                        <span className="badge badge-danger rounded-full px-2 py-1">{unreadCount} unread</span>
                    )}
                </div>
                <div className="flex gap-2 items-center">
                    <div className="btn-group">
                        <button
                            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setFilter('all')}>
                            All
                        </button>
                        <button
                            className={`btn btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setFilter('unread')}>
                            Unread
                        </button>
                    </div>
                    {unreadCount > 0 && (
                        <button className="btn btn-secondary btn-sm" onClick={handleMarkAllRead}>
                            Mark all as read
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : displayed.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">🔔</div>
                    <p>{filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}</p>
                </div>
            ) : (
                <div className="divide-y divide-gray-200 rounded-lg shadow-sm border border-gray-200 bg-white">
                    {displayed.map(n => {
                        const meta   = TYPE_META[n.type] ?? { icon: '🔔', color: 'secondary', label: n.type }
                        const colors = COLOR_CLASSES[meta.color] ?? COLOR_CLASSES.secondary
                        return (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 py-3 px-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-violet-50/40' : ''}`}>

                                {/* Icon bubble */}
                                <div className={`rounded-full ${colors.iconBg} flex items-center justify-center flex-shrink-0 text-lg`}
                                    style={{ width: '40px', height: '40px' }}>
                                    {meta.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.badgeBg}`}>
                                            {meta.label}
                                        </span>
                                        {!n.isRead && (
                                            <span className="inline-block w-2 h-2 bg-red-600 rounded-full" />
                                        )}
                                    </div>
                                    <p className="mb-0 text-sm text-gray-800">{n.message}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                                </div>

                                {/* Mark read button */}
                                {!n.isRead && (
                                    <button
                                        className="btn btn-secondary btn-sm flex-shrink-0 text-xs"
                                        onClick={() => handleMarkRead(n.id)}>
                                        Mark read
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center gap-1 justify-center mt-6">
                    <button className="page-btn" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                    {[...Array(totalPages)].map((_, i) => (
                        <button key={i} className={`page-btn ${currentPage === i ? 'page-btn-active' : ''}`} onClick={() => setCurrentPage(i)}>{i + 1}</button>
                    ))}
                    <button className="page-btn" disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
            )}
        </div>
    )
}

export default NotificationsPage
