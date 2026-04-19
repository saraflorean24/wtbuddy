import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getEvents, getEventById, createEvent, updateEvent, deleteEvent, joinEvent, leaveEvent, getPendingParticipants, respondToParticipant, getAcceptedParticipants, getDeclinedParticipants, reinviteParticipant, acceptEventInvitation, declineEventInvitation } from '../api/eventApi'
import { useAuth } from '../context/AuthContext'

function Pagination({ currentPage, totalPages, onChange }) {
    if (totalPages <= 1) return null
    return (
        <div className="flex items-center gap-1 justify-center mt-6">
            <button className="page-btn" disabled={currentPage === 0} onClick={() => onChange(currentPage - 1)}>Previous</button>
            {[...Array(totalPages)].map((_, i) => (
                <button key={i} className={`page-btn ${currentPage === i ? 'page-btn-active' : ''}`} onClick={() => onChange(i)}>{i + 1}</button>
            ))}
            <button className="page-btn" disabled={currentPage === totalPages - 1} onClick={() => onChange(currentPage + 1)}>Next</button>
        </div>
    )
}

function Modal({ title, onClose, children, footer, size = 'md' }) {
    return (
        <div className="modal-overlay">
            <div className={`modal-box modal-box-${size}`}>
                <div className="modal-header">
                    <h5 className="text-base font-semibold m-0">{title}</h5>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    )
}

function EventsPage() {
    const { user } = useAuth()
    const [searchParams] = useSearchParams()
    const isAdmin = user?.role === 'ADMIN'

    const [events,      setEvents]      = useState([])
    const [totalPages,  setTotalPages]  = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [search,      setSearch]      = useState('')
    const [loading,     setLoading]     = useState(false)
    const [error,       setError]       = useState('')

    const [showModal,     setShowModal]     = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [formData, setFormData] = useState({
        title: '', description: '', location: '', eventDate: '', maxParticipants: '',
    })

    const [showDeleteModal,   setShowDeleteModal]   = useState(false)
    const [showLeaveModal,    setShowLeaveModal]     = useState(false)
    const [eventToLeave,      setEventToLeave]       = useState(null)
    const [showRequestsModal, setShowRequestsModal] = useState(false)
    const [requestsEvent,     setRequestsEvent]     = useState(null)
    const [pendingList,       setPendingList]        = useState([])
    const [declinedList,      setDeclinedList]       = useState([])

    const [showMembersModal, setShowMembersModal] = useState(false)
    const [membersEvent,     setMembersEvent]     = useState(null)
    const [membersList,      setMembersList]      = useState([])

    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailEvent,     setDetailEvent]     = useState(null)

    useEffect(() => { fetchEvents() }, [currentPage, search])

    // Auto-open detail modal when navigated from dashboard with ?open=id
    useEffect(() => {
        const openId = searchParams.get('open')
        if (!openId) return
        getEventById(Number(openId))
            .then(ev => { setDetailEvent(ev); setShowDetailModal(true) })
            .catch(() => {})
    }, [])

    const fetchEvents = async () => {
        setLoading(true)
        try {
            const data = await getEvents(currentPage, 10, search)
            setEvents(data.content)
            setTotalPages(data.totalPages)
        } catch { setError('Failed to load events') }
        finally  { setLoading(false) }
    }

    const handleOpenCreate = () => {
        setSelectedEvent(null)
        setFormData({ title: '', description: '', location: '', eventDate: '', maxParticipants: '' })
        setShowModal(true)
    }

    const handleOpenEdit = (event) => {
        setSelectedEvent(event)
        setFormData({
            title: event.title,
            description: event.description || '',
            location: event.location || '',
            eventDate: event.eventDate ? event.eventDate.slice(0, 16) : '',
            maxParticipants: event.maxParticipants || '',
        })
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                ...formData,
                eventDate: formData.eventDate + ':00',
                maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
            }
            if (selectedEvent) { await updateEvent(selectedEvent.id, payload) }
            else               { await createEvent(payload) }
            setShowModal(false)
            fetchEvents()
        } catch { setError('Failed to save event') }
    }

    const handleDelete = async () => {
        try {
            await deleteEvent(selectedEvent.id)
            setShowDeleteModal(false)
            fetchEvents()
        } catch { setError('Failed to delete event') }
    }

    const handleJoin = async (event) => {
        try {
            await joinEvent(event.id)
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to join event') }
    }

    const handleOpenRequests = async (event) => {
        setRequestsEvent(event); setPendingList([]); setDeclinedList([]); setShowRequestsModal(true)
        try {
            const [pending, declined] = await Promise.all([
                getPendingParticipants(event.id),
                getDeclinedParticipants(event.id),
            ])
            setPendingList(pending)
            setDeclinedList(declined)
        } catch { setError('Failed to load requests') }
    }

    const handleOpenMembers = async (event) => {
        setMembersEvent(event); setMembersList([]); setShowMembersModal(true)
        try { setMembersList(await getAcceptedParticipants(event.id)) }
        catch { setError('Failed to load members') }
    }

    const handleRespond = async (participantId, status) => {
        try {
            await respondToParticipant(participantId, status)
            setPendingList(prev => prev.filter(p => p.id !== participantId))
            if (status === 'DECLINED') {
                const declined = await getDeclinedParticipants(requestsEvent.id)
                setDeclinedList(declined)
            }
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to respond') }
    }

    const handleReinvite = async (participantId) => {
        try {
            await reinviteParticipant(participantId)
            setDeclinedList(prev => prev.filter(p => p.id !== participantId))
        } catch (err) { setError(err.response?.data?.message || 'Failed to send invitation') }
    }

    const handleAcceptInvitation = async (event) => {
        try {
            await acceptEventInvitation(event.id)
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to accept invitation') }
    }

    const handleDeclineInvitation = async (event) => {
        try {
            await declineEventInvitation(event.id)
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to decline invitation') }
    }

    const handleLeaveConfirm = (event) => { setEventToLeave(event); setShowLeaveModal(true) }

    const handleLeave = async () => {
        try {
            await leaveEvent(eventToLeave.id)
            setShowLeaveModal(false)
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to leave event') }
    }

    const renderAction = (event) => {
        if (isAdmin) {
            return (
                <div className="flex gap-1 flex-wrap">
                    <button className="btn btn-warning btn-sm" onClick={() => handleOpenEdit(event)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => { setSelectedEvent(event); setShowDeleteModal(true) }}>Delete</button>
                    <button className="btn btn-info btn-sm" onClick={() => handleOpenRequests(event)}>Requests</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleOpenMembers(event)}>Members</button>
                </div>
            )
        }

        const status = event.myParticipantStatus
        const declinedByOwner = event.myParticipantDeclinedByOwner
        const isFull = event.maxParticipants != null && event.maxParticipants - (event.participantCount || 0) <= 0
        // auto-declined (declinedByOwner=false) → treat same as no membership
        const effectiveStatus = (status === 'DECLINED' && !declinedByOwner) ? null : status

        if (effectiveStatus === 'ACCEPTED') return (
            <button className="btn btn-outline-danger btn-sm" onClick={() => handleLeaveConfirm(event)}>Leave</button>
        )
        if (effectiveStatus === 'PENDING') return (
            <button className="btn btn-secondary btn-sm" disabled>Request Sent</button>
        )
        if (effectiveStatus === 'INVITED') return (
            <div className="flex gap-1 flex-wrap">
                <span className="badge badge-info px-2 py-1">Invited!</span>
                <button className="btn btn-success btn-sm" onClick={() => handleAcceptInvitation(event)}>Accept</button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeclineInvitation(event)}>Decline</button>
            </div>
        )
        if (effectiveStatus === 'DECLINED') return (
            <span className="badge badge-danger px-3 py-1.5">Declined</span>
        )
        return (
            <button className="btn btn-success btn-sm" onClick={() => handleJoin(event)} disabled={isFull}>
                {isFull ? 'Full' : 'Join Event'}
            </button>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Events</h2>
                {isAdmin && (
                    <button className="btn btn-primary btn-md" onClick={handleOpenCreate}>+ Add Event</button>
                )}
            </div>

            {error && (
                <div className="alert alert-danger justify-between">
                    <span>{error}</span>
                    <button className="btn-close text-red-700" onClick={() => setError('')}>×</button>
                </div>
            )}

            <div className="mb-4">
                <input type="text" className="form-control" placeholder="Search events..."
                    value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(0) }} />
            </div>

            {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
                <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th><th>Location</th><th>Date</th>
                                <th>Available Spots</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.length === 0
                                ? <tr><td colSpan="5" className="text-center text-gray-400 py-8">No events found</td></tr>
                                : events.map(event => (
                                    <tr key={event.id}>
                                        <td>
                                            <div className="font-semibold">{event.title}</div>
                                            {event.description && (
                                                <div className="text-gray-500 text-xs mt-0.5 mx-auto" style={{ maxWidth: '260px' }}>
                                                    {event.description.length > 80
                                                        ? event.description.slice(0, 80) + '…'
                                                        : event.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-gray-600">{event.location || '-'}</td>
                                        <td className="text-gray-600 whitespace-nowrap">{new Date(event.eventDate).toLocaleDateString()}</td>
                                        <td className="text-gray-600">{event.maxParticipants != null
                                            ? event.maxParticipants - (event.participantCount || 0)
                                            : '-'}</td>
                                        <td>{renderAction(event)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Pagination currentPage={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

            {/* Add / Edit Modal */}
            {showModal && (
                <Modal
                    title={selectedEvent ? 'Edit Event' : 'Add Event'}
                    onClose={() => setShowModal(false)}
                    footer={
                        <>
                            <button className="btn btn-secondary btn-md" onClick={() => setShowModal(false)}>Cancel</button>
                            <button form="event-form" type="submit" className="btn btn-primary btn-md">
                                {selectedEvent ? 'Save Changes' : 'Create Event'}
                            </button>
                        </>
                    }>
                    <form id="event-form" onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="form-label">Title *</label>
                            <input type="text" className="form-control" required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="mb-4">
                            <label className="form-label">Description</label>
                            <textarea className="form-control" rows="3"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })} />
                        </div>
                        <div className="mb-4">
                            <label className="form-label">Location</label>
                            <input type="text" className="form-control"
                                value={formData.location}
                                onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        </div>
                        <div className="mb-4">
                            <label className="form-label">Date *</label>
                            <input type="datetime-local" className="form-control" required
                                value={formData.eventDate}
                                onChange={e => setFormData({ ...formData, eventDate: e.target.value })} />
                        </div>
                        <div className="mb-2">
                            <label className="form-label">Max Participants</label>
                            <input type="number" className="form-control"
                                value={formData.maxParticipants}
                                onChange={e => setFormData({ ...formData, maxParticipants: e.target.value })} />
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <Modal
                    title="Confirm Delete"
                    onClose={() => setShowDeleteModal(false)}
                    footer={
                        <>
                            <button className="btn btn-secondary btn-md" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn btn-danger btn-md" onClick={handleDelete}>Delete</button>
                        </>
                    }>
                    Are you sure you want to delete <strong>{selectedEvent?.title}</strong>?
                </Modal>
            )}

            {/* Requests Modal */}
            {showRequestsModal && (
                <Modal
                    title={`Join Requests — ${requestsEvent?.title}`}
                    onClose={() => setShowRequestsModal(false)}
                    footer={<button className="btn btn-secondary btn-md" onClick={() => setShowRequestsModal(false)}>Close</button>}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Pending</p>
                    {pendingList.length === 0
                        ? <p className="text-gray-400 mb-0">No pending requests.</p>
                        : <ul className="divide-y divide-gray-100">
                            {pendingList.map(p => (
                                <li key={p.id} className="flex justify-between items-center py-3">
                                    <span className="font-semibold">{p.username}</span>
                                    <div className="flex gap-2">
                                        <button className="btn btn-success btn-sm" onClick={() => handleRespond(p.id, 'ACCEPTED')}>Accept</button>
                                        <button className="btn btn-danger btn-sm" onClick={() => handleRespond(p.id, 'DECLINED')}>Decline</button>
                                    </div>
                                </li>
                            ))}
                        </ul>}
                    {declinedList.length > 0 && (
                        <>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-5 mb-2">Declined</p>
                            <ul className="divide-y divide-gray-100">
                                {declinedList.map(p => (
                                    <li key={p.id} className="flex justify-between items-center py-3">
                                        <span className="font-semibold">{p.username}</span>
                                        <button className="btn btn-info btn-sm" onClick={() => handleReinvite(p.id)}>Re-invite</button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </Modal>
            )}

            {/* Members Modal (admin) */}
            {showMembersModal && (
                <Modal
                    title={`Members — ${membersEvent?.title}`}
                    onClose={() => setShowMembersModal(false)}
                    footer={<button className="btn btn-secondary btn-md" onClick={() => setShowMembersModal(false)}>Close</button>}>
                    {membersList.length === 0
                        ? <p className="text-gray-400 mb-0">No accepted members yet.</p>
                        : <ul className="divide-y divide-gray-100">
                            {membersList.map(m => (
                                <li key={m.id} className="flex items-center gap-2 py-2.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="text-gray-400 flex-shrink-0">
                                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4z"/>
                                    </svg>
                                    <span className="font-semibold text-sm">{m.username}</span>
                                    <span className="text-xs text-gray-400 ml-auto">
                                        {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>}
                </Modal>
            )}

            {/* Leave Confirmation Modal */}
            {showLeaveModal && (
                <Modal
                    title="Leave Event"
                    onClose={() => setShowLeaveModal(false)}
                    footer={
                        <>
                            <button className="btn btn-secondary btn-md" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                            <button className="btn btn-danger btn-md" onClick={handleLeave}>Leave</button>
                        </>
                    }>
                    Are you sure you want to leave <strong>{eventToLeave?.title}</strong>?
                </Modal>
            )}

            {/* Event Detail Modal (opened via ?open=id from dashboard) */}
            {showDetailModal && detailEvent && (
                <Modal
                    title={detailEvent.title}
                    onClose={() => setShowDetailModal(false)}
                    footer={<button className="btn btn-secondary btn-md" onClick={() => setShowDetailModal(false)}>Close</button>}>
                    <div className="space-y-3 text-sm text-gray-700">
                        {detailEvent.description && <p className="text-gray-600 leading-relaxed">{detailEvent.description}</p>}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            {detailEvent.location && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Location</p>
                                    <p>{detailEvent.location}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Date</p>
                                <p>{new Date(detailEvent.eventDate).toLocaleString()}</p>
                            </div>
                            {detailEvent.maxParticipants != null && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Spots left</p>
                                    <p>{detailEvent.maxParticipants - (detailEvent.participantCount || 0)}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Organizer</p>
                                <p>@{detailEvent.organizerUsername}</p>
                            </div>
                        </div>
                        <div className="pt-2">{renderAction(detailEvent)}</div>
                    </div>
                </Modal>
            )}
        </div>
    )
}

export default EventsPage
