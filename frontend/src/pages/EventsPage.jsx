import { useState, useEffect } from 'react'
import { getEvents, createEvent, updateEvent, deleteEvent, joinEvent, leaveEvent, getPendingParticipants, respondToParticipant } from '../api/eventApi'
import { useAuth } from '../context/AuthContext'

function EventsPage() {
    const { user } = useAuth()
    const isAdmin = user?.role === 'ADMIN'

    const [events,      setEvents]      = useState([])
    const [totalPages,  setTotalPages]  = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [search,      setSearch]      = useState('')
    const [loading,     setLoading]     = useState(false)
    const [error,       setError]       = useState('')

    // Create / Edit modal
    const [showModal,    setShowModal]    = useState(false)
    const [selectedEvent, setSelectedEvent] = useState(null)
    const [formData, setFormData] = useState({
        title: '', description: '', location: '', eventDate: '', maxParticipants: '',
    })

    // Delete modal
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    // Leave confirmation modal
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [eventToLeave,   setEventToLeave]   = useState(null)

    // Requests modal (admin)
    const [showRequestsModal, setShowRequestsModal] = useState(false)
    const [requestsEvent,     setRequestsEvent]     = useState(null)
    const [pendingList,       setPendingList]        = useState([])

    useEffect(() => { fetchEvents() }, [currentPage, search])

    const fetchEvents = async () => {
        setLoading(true)
        try {
            const data = await getEvents(currentPage, 10, search)
            setEvents(data.content)
            setTotalPages(data.totalPages)
        } catch { setError('Failed to load events') }
        finally  { setLoading(false) }
    }

    // ── Create / Edit ────────────────────────────────────────────────────
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

    // ── Delete ───────────────────────────────────────────────────────────
    const handleDelete = async () => {
        try {
            await deleteEvent(selectedEvent.id)
            setShowDeleteModal(false)
            fetchEvents()
        } catch { setError('Failed to delete event') }
    }

    // ── Join ─────────────────────────────────────────────────────────────
    const handleJoin = async (event) => {
        try {
            await joinEvent(event.id)
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to join event') }
    }

    // ── Requests (admin) ─────────────────────────────────────────────────
    const handleOpenRequests = async (event) => {
        setRequestsEvent(event); setPendingList([]); setShowRequestsModal(true)
        try { setPendingList(await getPendingParticipants(event.id)) }
        catch { setError('Failed to load requests') }
    }

    const handleRespond = async (participantId, status) => {
        try {
            await respondToParticipant(participantId, status)
            setPendingList(prev => prev.filter(p => p.id !== participantId))
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to respond') }
    }

    // ── Leave ────────────────────────────────────────────────────────────
    const handleLeaveConfirm = (event) => { setEventToLeave(event); setShowLeaveModal(true) }

    const handleLeave = async () => {
        try {
            await leaveEvent(eventToLeave.id)
            setShowLeaveModal(false)
            fetchEvents()
        } catch (err) { setError(err.response?.data?.message || 'Failed to leave event') }
    }

    // ── Action button per event ──────────────────────────────────────────
    const renderAction = (event) => {
        if (isAdmin) {
            return (
                <>
                    <button className="btn btn-sm btn-warning me-1" onClick={() => handleOpenEdit(event)}>Edit</button>
                    <button className="btn btn-sm btn-danger me-1"
                        onClick={() => { setSelectedEvent(event); setShowDeleteModal(true) }}>Delete</button>
                    <button className="btn btn-sm btn-info" onClick={() => handleOpenRequests(event)}>Requests</button>
                </>
            )
        }

        const status = event.myParticipantStatus
        const isFull = event.maxParticipants != null &&
            event.maxParticipants - (event.participantCount || 0) <= 0

        if (status === 'ACCEPTED') {
            return (
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleLeaveConfirm(event)}>
                    Leave
                </button>
            )
        }
        if (status === 'PENDING') {
            return (
                <button className="btn btn-sm btn-secondary" disabled>
                    Request Sent
                </button>
            )
        }
        if (status === 'DECLINED') {
            return <span className="badge bg-danger px-2 py-2">Declined</span>
        }
        return (
            <button className="btn btn-sm btn-success" onClick={() => handleJoin(event)}
                disabled={isFull}>
                {isFull ? 'Full' : 'Join Event'}
            </button>
        )
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Events</h2>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={handleOpenCreate}>+ Add Event</button>
                )}
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible">
                    {error}
                    <button className="btn-close" onClick={() => setError('')} />
                </div>
            )}

            <div className="mb-3">
                <input type="text" className="form-control" placeholder="Search events..."
                    value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(0) }} />
            </div>

            {loading ? <div className="text-center">Loading...</div> : (
                <table className="table table-striped table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Title</th><th>Location</th><th>Date</th>
                            <th>Available Spots</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.length === 0
                            ? <tr><td colSpan="5" className="text-center">No events found</td></tr>
                            : events.map(event => (
                                <tr key={event.id}>
                                    <td>
                                        <div className="fw-semibold">{event.title}</div>
                                        {event.description && (
                                            <div className="text-muted small" style={{ maxWidth: '260px' }}>
                                                {event.description.length > 80
                                                    ? event.description.slice(0, 80) + '…'
                                                    : event.description}
                                            </div>
                                        )}
                                    </td>
                                    <td>{event.location || '-'}</td>
                                    <td>{new Date(event.eventDate).toLocaleDateString()}</td>
                                    <td>{event.maxParticipants != null
                                        ? event.maxParticipants - (event.participantCount || 0)
                                        : '-'}</td>
                                    <td>{renderAction(event)}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}

            {totalPages > 1 && (
                <nav><ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 0 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                    </li>
                    {[...Array(totalPages)].map((_, i) => (
                        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
                            <button className="page-link" onClick={() => setCurrentPage(i)}>{i + 1}</button>
                        </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                    </li>
                </ul></nav>
            )}

            {/* ── Add / Edit Modal ── */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{selectedEvent ? 'Edit Event' : 'Add Event'}</h5>
                                <button className="btn-close" onClick={() => setShowModal(false)} />
                            </div>
                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Title *</label>
                                        <input type="text" className="form-control" required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-control" rows="3"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Location</label>
                                        <input type="text" className="form-control"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Date *</label>
                                        <input type="datetime-local" className="form-control" required
                                            value={formData.eventDate}
                                            onChange={e => setFormData({ ...formData, eventDate: e.target.value })} />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Max Participants</label>
                                        <input type="number" className="form-control"
                                            value={formData.maxParticipants}
                                            onChange={e => setFormData({ ...formData, maxParticipants: e.target.value })} />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">
                                        {selectedEvent ? 'Save Changes' : 'Create Event'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Modal ── */}
            {showDeleteModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button className="btn-close" onClick={() => setShowDeleteModal(false)} />
                            </div>
                            <div className="modal-body">
                                Are you sure you want to delete <strong>{selectedEvent?.title}</strong>?
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Requests Modal (admin) ── */}
            {showRequestsModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Join Requests — {requestsEvent?.title}</h5>
                                <button className="btn-close" onClick={() => setShowRequestsModal(false)} />
                            </div>
                            <div className="modal-body">
                                {pendingList.length === 0
                                    ? <p className="text-muted mb-0">No pending requests.</p>
                                    : <ul className="list-group list-group-flush">
                                        {pendingList.map(p => (
                                            <li key={p.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                                                <span className="fw-semibold">{p.username}</span>
                                                <div>
                                                    <button className="btn btn-sm btn-success me-2"
                                                        onClick={() => handleRespond(p.id, 'ACCEPTED')}>Accept</button>
                                                    <button className="btn btn-sm btn-danger"
                                                        onClick={() => handleRespond(p.id, 'DECLINED')}>Decline</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowRequestsModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Leave Confirmation Modal ── */}
            {showLeaveModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Leave Event</h5>
                                <button className="btn-close" onClick={() => setShowLeaveModal(false)} />
                            </div>
                            <div className="modal-body">
                                Are you sure you want to leave <strong>{eventToLeave?.title}</strong>?
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleLeave}>Leave</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EventsPage
