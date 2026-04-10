import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import {
    GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow,
} from '@react-google-maps/api'
import {
    getTrips, getMyTrips, createTrip, updateTrip, deleteTrip,
    getTripStops, replaceStops, requestToJoin, respondToJoinRequest,
    getPendingRequests, getMyMembership,
} from '../api/tripApi'

const MAPS_LIBRARIES = ['places']           // stable ref — do NOT move inside component
const MAPS_API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const USA_CENTER     = { lat: 39.8283, lng: -98.5795 }
const EMPTY_STOP     = { selectedPlace: null, dayNumber: '', notes: '' }

// Format an array of day numbers into a compact label: [1,2,3,5] → "1-3, 5"
const formatDayRange = (days) => {
    const sorted = [...new Set(days)].sort((a, b) => a - b)
    const ranges = []
    let start = sorted[0], end = sorted[0]
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) { end = sorted[i] }
        else { ranges.push(start === end ? `${start}` : `${start}-${end}`); start = end = sorted[i] }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`)
    return ranges.join(', ')
}

// Group stops by city, merging day numbers — result is sorted by first day
const groupByCity = (stopsArr) => {
    const map = new Map()
    for (const s of [...stopsArr].sort((a, b) => a.dayNumber - b.dayNumber || (a.orderIndex ?? 0) - (b.orderIndex ?? 0))) {
        if (s.lat == null || s.lng == null) continue
        const key = (s.city || '').toLowerCase().trim()
        if (!map.has(key)) {
            map.set(key, { ...s, days: [s.dayNumber], allNotes: s.notes ? [s.notes] : [] })
        } else {
            const g = map.get(key)
            if (!g.days.includes(s.dayNumber)) g.days.push(s.dayNumber)
            if (s.notes && !g.allNotes.includes(s.notes)) g.allNotes.push(s.notes)
        }
    }
    return [...map.values()].map(g => ({
        ...g,
        dayLabel: formatDayRange(g.days),
        notes: g.allNotes.join(' · '),
    }))
}

// Deduplicated stops sorted by day — used for route waypoints
const sortedForRoute = (arr) => groupByCity(arr)

function TripsPage() {
    const { user } = useAuth()

    // ── List ──────────────────────────────────────────────────────────────
    const [trips,       setTrips]       = useState([])
    const [totalPages,  setTotalPages]  = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [search,      setSearch]      = useState('')
    const [loading,     setLoading]     = useState(false)
    const [error,       setError]       = useState('')
    const [viewMode,    setViewMode]    = useState('all')

    // ── Create / Edit modal ───────────────────────────────────────────────
    const [showModal,    setShowModal]   = useState(false)
    const [selectedTrip, setSelectedTrip] = useState(null)
    const [formData, setFormData] = useState({
        title: '', description: '', startDate: '', endDate: '',
        isPublic: false, maxMembers: '', status: 'DRAFT',
    })
    const [stops,         setStops]         = useState([])
    const [stopsModified, setStopsModified] = useState(false)
    const [stopForm,      setStopForm]      = useState(EMPTY_STOP)

    // Custom city autocomplete
    const [cityQuery,       setCityQuery]       = useState('')
    const [citySuggestions, setCitySuggestions] = useState([])
    const autocompleteServiceRef = useRef(null)

    // Modal map
    const modalMapRef        = useRef(null)
    const [modalDirections,  setModalDirections]  = useState(null)

    // ── Delete modal ──────────────────────────────────────────────────────
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [tripToDelete,    setTripToDelete]    = useState(null)

    // ── Detail / map modal ────────────────────────────────────────────────
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailTrip,      setDetailTrip]      = useState(null)
    const [tripStops,       setTripStops]       = useState([])
    const [stopsLoading,    setStopsLoading]    = useState(false)
    const [myMembership,    setMyMembership]    = useState(null)
    const [activeMarker,    setActiveMarker]    = useState(null)

    const detailMapRef       = useRef(null)
    const [detailDirections, setDetailDirections] = useState(null)

    // ── Requests modal ────────────────────────────────────────────────────
    const [showRequestsModal, setShowRequestsModal] = useState(false)
    const [requestsTrip,      setRequestsTrip]      = useState(null)
    const [pendingRequests,   setPendingRequests]   = useState([])

    // ── Google Maps ───────────────────────────────────────────────────────
    const { isLoaded: mapsLoaded } = useJsApiLoader({
        googleMapsApiKey: MAPS_API_KEY,
        libraries: MAPS_LIBRARIES,
    })

    // ── Effects ───────────────────────────────────────────────────────────
    useEffect(() => { fetchTrips() }, [currentPage, search, viewMode])

    // Recompute route for modal map whenever stops change
    useEffect(() => {
        if (!mapsLoaded || !window.google) return
        computeRoute(stops, setModalDirections)
    }, [stops, mapsLoaded])

    // Fit modal map to stops
    useEffect(() => {
        if (!modalMapRef.current || !window.google) return
        fitBounds(modalMapRef.current, stops.filter(s => s.lat != null && s.lng != null))
    }, [stops])

    // Recompute route for detail map whenever tripStops change
    useEffect(() => {
        if (!mapsLoaded || !window.google) return
        computeRoute(tripStops, setDetailDirections)
    }, [tripStops, mapsLoaded])

    // Fit detail map to stops
    useEffect(() => {
        if (!detailMapRef.current || !window.google) return
        fitBounds(detailMapRef.current, tripStops.filter(s => s.lat != null && s.lng != null))
    }, [tripStops])

    // ── Helpers ───────────────────────────────────────────────────────────
    const computeRoute = (stopsArr, setDir) => {
        const ordered = sortedForRoute(stopsArr)
        if (ordered.length < 2) { setDir(null); return }

        new window.google.maps.DirectionsService().route(
            {
                origin:      { lat: ordered[0].lat, lng: ordered[0].lng },
                destination: { lat: ordered[ordered.length - 1].lat, lng: ordered[ordered.length - 1].lng },
                waypoints:   ordered.slice(1, -1).map(s => ({
                    location: { lat: s.lat, lng: s.lng },
                    stopover: true,
                })),
                travelMode: window.google.maps.TravelMode.DRIVING,
                optimizeWaypoints: false,
            },
            (result, status) => status === 'OK' ? setDir(result) : setDir(null)
        )
    }

    const fitBounds = (map, pts) => {
        if (!pts.length) return
        if (pts.length === 1) { map.panTo({ lat: pts[0].lat, lng: pts[0].lng }); map.setZoom(9); return }
        const bounds = new window.google.maps.LatLngBounds()
        pts.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))
        map.fitBounds(bounds, 40)
    }

    const tripDuration = (start, end) => {
        if (!start || !end) return null
        const d = Math.ceil((new Date(end) - new Date(start)) / 86400000)
        return d > 0 ? `${d} day${d !== 1 ? 's' : ''}` : null
    }

    // ── Fetch ─────────────────────────────────────────────────────────────
    const fetchTrips = async () => {
        setLoading(true); setError('')
        try {
            const data = viewMode === 'my'
                ? await getMyTrips(currentPage, 10, search)
                : await getTrips(currentPage, 10, search)
            setTrips(data.content)
            setTotalPages(data.totalPages)
        } catch { setError('Failed to load trips') }
        finally  { setLoading(false) }
    }

    // ── Create / Edit modal ───────────────────────────────────────────────
    const handleOpenCreate = () => {
        setSelectedTrip(null)
        setFormData({ title: '', description: '', startDate: '', endDate: '', isPublic: false, maxMembers: '', status: 'DRAFT' })
        setStops([])
        setStopsModified(false)
        setStopForm(EMPTY_STOP)
        setCityQuery('')
        setCitySuggestions([])
        setModalDirections(null)
        setShowModal(true)
    }

    const handleOpenEdit = async (trip) => {
        setSelectedTrip(trip)
        setFormData({
            title: trip.title, description: trip.description || '',
            startDate: trip.startDate || '', endDate: trip.endDate || '',
            isPublic: trip.isPublic ?? false, maxMembers: trip.maxMembers || '',
            status: trip.status || 'DRAFT',
        })
        setStops([])
        setStopsModified(false)
        setStopForm(EMPTY_STOP)
        setCityQuery('')
        setCitySuggestions([])
        setModalDirections(null)
        setShowModal(true)
        try {
            const existing = await getTripStops(trip.id)
            setStops(existing.map((s, i) => ({
                _key: s.id ?? i,
                city: s.city, country: s.country,
                dayNumber: s.dayNumber,
                address: s.address || '', notes: s.notes || '',
                orderIndex: s.orderIndex,
                lat: s.lat, lng: s.lng,
            })))
        } catch { /* non-critical */ }
    }

    // ── City autocomplete (AutocompleteService — stateless, reliable) ─────
    const handleCityInput = (value) => {
        setCityQuery(value)
        setStopForm(prev => ({ ...prev, selectedPlace: null }))
        if (!value || value.length < 2 || !window.google) { setCitySuggestions([]); return }
        if (!autocompleteServiceRef.current) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
        }
        autocompleteServiceRef.current.getPlacePredictions(
            { input: value, componentRestrictions: { country: 'us' }, types: ['(cities)'] },
            (predictions, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                    setCitySuggestions(predictions)
                } else {
                    setCitySuggestions([])
                }
            }
        )
    }

    const handleSelectCity = (suggestion) => {
        setCitySuggestions([])
        const svc = new window.google.maps.places.PlacesService(document.createElement('div'))
        svc.getDetails(
            { placeId: suggestion.place_id, fields: ['name', 'geometry', 'address_components'] },
            (place, status) => {
                if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry) return
                const comps = place.address_components || []
                const city  = comps.find(c => c.types.includes('locality'))?.long_name
                           || comps.find(c => c.types.includes('administrative_area_level_3'))?.long_name
                           || place.name
                const state = comps.find(c => c.types.includes('administrative_area_level_1'))?.short_name || ''
                const label = `${city}${state ? ', ' + state : ''}`
                setCityQuery(label)
                setStopForm(prev => ({
                    ...prev,
                    selectedPlace: {
                        city: label,
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                    },
                }))
            }
        )
    }

    const handleAddStop = () => {
        const { selectedPlace, dayNumber, notes } = stopForm
        if (!selectedPlace || !dayNumber) {
            if (!selectedPlace) setError('Select a city from the suggestions first.')
            return
        }
        setStops(prev => [...prev, {
            _key: Date.now(),
            city: selectedPlace.city,
            country: 'United States',
            dayNumber: parseInt(dayNumber),
            address: '', notes: notes?.trim() || '',
            orderIndex: prev.length + 1,
            lat: selectedPlace.lat, lng: selectedPlace.lng,
        }])
        setStopsModified(true)
        setCityQuery('')
        setCitySuggestions([])
        setStopForm(EMPTY_STOP)
    }

    const handleRemoveStop = (key) => {
        setStops(prev => prev.filter(s => s._key !== key).map((s, i) => ({ ...s, orderIndex: i + 1 })))
        setStopsModified(true)
    }

    // Prevent Enter key in stop fields from submitting the parent form
    const stopEnterKey = (e) => { if (e.key === 'Enter') e.preventDefault() }

    const handleSubmit = async (e) => {
        e.preventDefault(); setError('')
        try {
            const payload = {
                ...formData,
                maxMembers: formData.maxMembers ? parseInt(formData.maxMembers) : null,
                startDate: formData.startDate || null,
                endDate:   formData.endDate   || null,
            }
            let tripId
            if (selectedTrip) {
                await updateTrip(selectedTrip.id, payload)
                tripId = selectedTrip.id
            } else {
                const created = await createTrip(payload)
                tripId = created.id
            }
            // Only sync stops when creating (always) or when stops were actually modified
            if (!selectedTrip || stopsModified) {
                await replaceStops(tripId, stops.map((s, i) => ({
                    city: s.city, country: s.country,
                    address: s.address || null, notes: s.notes || null,
                    dayNumber: s.dayNumber, orderIndex: i + 1,
                    lat: s.lat, lng: s.lng,
                })))
            }
            setShowModal(false)
            fetchTrips()
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to save trip')
        }
    }

    // ── Delete modal ──────────────────────────────────────────────────────
    const handleOpenDelete = (trip) => { setTripToDelete(trip); setShowDeleteModal(true) }

    const handleDelete = async () => {
        try { await deleteTrip(tripToDelete.id); setShowDeleteModal(false); fetchTrips() }
        catch { setError('Failed to delete trip') }
    }

    // ── Detail modal ──────────────────────────────────────────────────────
    const handleOpenDetail = async (trip) => {
        setDetailTrip(trip); setTripStops([]); setDetailDirections(null)
        setMyMembership(null); setActiveMarker(null); setShowDetailModal(true)
        setStopsLoading(true)
        try {
            const isOwner = trip.username === user?.username
            const [stopsRes, memberRes] = await Promise.allSettled([
                getTripStops(trip.id),
                isOwner ? Promise.resolve(null) : getMyMembership(trip.id),
            ])
            if (stopsRes.status === 'fulfilled')  setTripStops(stopsRes.value)
            if (memberRes.status === 'fulfilled') setMyMembership(memberRes.value)
        } finally { setStopsLoading(false) }
    }

    const handleJoinRequest = async () => {
        try { setMyMembership(await requestToJoin(detailTrip.id)) }
        catch (err) { setError(err.response?.data?.message || 'Failed to send join request') }
    }

    // ── Requests modal ────────────────────────────────────────────────────
    const handleOpenRequests = async (trip) => {
        setRequestsTrip(trip); setPendingRequests([]); setShowRequestsModal(true)
        try { setPendingRequests(await getPendingRequests(trip.id)) }
        catch { setError('Failed to load requests') }
    }

    const handleRespondToRequest = async (memberId, status) => {
        try {
            await respondToJoinRequest(memberId, status)
            setPendingRequests(prev => prev.filter(r => r.id !== memberId))
            fetchTrips()
        } catch { setError('Failed to respond to request') }
    }

    // ── Map sub-render ────────────────────────────────────────────────────
    const renderMarkers = (stopsArr, directions) => {
        const groups = groupByCity(stopsArr)
        return <>
            {directions && (
                <DirectionsRenderer
                    directions={directions}
                    options={{
                        suppressMarkers: true,
                        polylineOptions: { strokeColor: '#1a73e8', strokeWeight: 4, strokeOpacity: 0.85 },
                    }}
                />
            )}
            {groups.map((grp, idx) => {
                const markerId = `${grp.city}-${idx}`
                return (
                    <Marker
                        key={markerId}
                        position={{ lat: grp.lat, lng: grp.lng }}
                        label={{ text: String(idx + 1), color: 'white', fontWeight: 'bold', fontSize: '12px' }}
                        onClick={() => setActiveMarker(markerId)}>
                        {activeMarker === markerId && (
                            <InfoWindow onCloseClick={() => setActiveMarker(null)}>
                                <div>
                                    <strong>{grp.city}</strong>
                                    <div style={{ fontSize: '12px', color: '#555' }}>Day {grp.dayLabel}</div>
                                    {grp.notes && <div style={{ fontSize: '12px' }}>{grp.notes}</div>}
                                </div>
                            </InfoWindow>
                        )}
                    </Marker>
                )
            })}
        </>
    }

    const noApiKey = !MAPS_API_KEY
    const mapPlaceholder = (msg) => (
        <div className="d-flex align-items-center justify-content-center bg-light rounded h-100 text-muted small">
            {msg}
        </div>
    )

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-3">
                    <h2 className="mb-0">Trips</h2>
                    <div className="btn-group btn-group-sm">
                        <button className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setViewMode('all'); setCurrentPage(0) }}>All Trips</button>
                        <button className={`btn ${viewMode === 'my' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setViewMode('my'); setCurrentPage(0) }}>My Trips</button>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleOpenCreate}>+ Add Trip</button>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible">
                    {error}
                    <button className="btn-close" onClick={() => setError('')} />
                </div>
            )}

            <div className="mb-3">
                <input type="text" className="form-control" placeholder="Search trips..."
                    value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(0) }} />
            </div>

            {/* Table */}
            {loading ? <div className="text-center py-4">Loading...</div> : (
                <table className="table table-striped table-hover">
                    <thead className="table-dark">
                        <tr>
                            <th>Title</th><th>Start</th><th>End</th><th>Duration</th>
                            <th>Status</th><th>Visibility</th><th>Members</th><th>Organizer</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trips.length === 0
                            ? <tr><td colSpan="9" className="text-center">No trips found</td></tr>
                            : trips.map(trip => (
                                <tr key={trip.id}>
                                    <td>
                                        <button className="btn btn-link p-0 text-decoration-none fw-semibold"
                                            onClick={() => handleOpenDetail(trip)}>{trip.title}</button>
                                    </td>
                                    <td>{trip.startDate || '-'}</td>
                                    <td>{trip.endDate || '-'}</td>
                                    <td>{tripDuration(trip.startDate, trip.endDate) || '-'}</td>
                                    <td>
                                        <span className={`badge ${trip.status === 'CONFIRMED' ? 'bg-success' : 'bg-secondary'}`}>
                                            {trip.status}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${trip.isPublic ? 'bg-info text-dark' : 'bg-warning text-dark'}`}>
                                            {trip.isPublic ? 'Public' : 'Private'}
                                        </span>
                                    </td>
                                    <td>{trip.memberCount ?? 0}{trip.maxMembers ? `/${trip.maxMembers}` : ''}</td>
                                    <td>{trip.username}</td>
                                    <td>
                                        <button className="btn btn-sm btn-outline-primary me-1"
                                            onClick={() => handleOpenDetail(trip)}>View</button>
                                        {trip.username === user?.username && <>
                                            <button className="btn btn-sm btn-warning me-1"
                                                onClick={() => handleOpenEdit(trip)}>Edit</button>
                                            <button className="btn btn-sm btn-danger me-1"
                                                onClick={() => handleOpenDelete(trip)}>Delete</button>
                                            <button className="btn btn-sm btn-info"
                                                onClick={() => handleOpenRequests(trip)}>Requests</button>
                                        </>}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            )}

            {/* Pagination */}
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

            {/* ══════════════════════════════════════════════════════════
                Create / Edit Modal  (modal-xl, split layout)
            ══════════════════════════════════════════════════════════ */}
            {showModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{selectedTrip ? 'Edit Trip' : 'Add Trip'}</h5>
                                <button className="btn-close" onClick={() => setShowModal(false)} />
                            </div>
                            <form onSubmit={handleSubmit}>
                                {/* Two-column body: details left, map right */}
                                <div className="modal-body p-0" style={{ height: '78vh' }}>
                                    <div className="d-flex h-100">

                                        {/* ── Left panel: details + stops ── */}
                                        <div className="p-4 border-end" style={{ width: '42%', overflowY: 'auto' }}>
                                            <div className="mb-3">
                                                <label className="form-label">Title *</label>
                                                <input type="text" className="form-control" required
                                                    value={formData.title}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Description</label>
                                                <textarea className="form-control" rows="2"
                                                    value={formData.description}
                                                    onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                            </div>
                                            <div className="row">
                                                <div className="col mb-3">
                                                    <label className="form-label">Start Date</label>
                                                    <input type="date" className="form-control"
                                                        value={formData.startDate}
                                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                                </div>
                                                <div className="col mb-3">
                                                    <label className="form-label">End Date</label>
                                                    <input type="date" className="form-control"
                                                        value={formData.endDate}
                                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="row">
                                                <div className="col mb-3">
                                                    <label className="form-label">Max Members</label>
                                                    <input type="number" className="form-control"
                                                        value={formData.maxMembers}
                                                        onChange={e => setFormData({ ...formData, maxMembers: e.target.value })} />
                                                </div>
                                                {selectedTrip && (
                                                    <div className="col mb-3">
                                                        <label className="form-label">Status</label>
                                                        <select className="form-select"
                                                            value={formData.status}
                                                            onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                                            <option value="DRAFT">Draft</option>
                                                            <option value="CONFIRMED">Confirmed</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mb-4">
                                                <div className="form-check form-switch">
                                                    <input className="form-check-input" type="checkbox" id="isPublicToggle"
                                                        checked={formData.isPublic}
                                                        onChange={e => setFormData({ ...formData, isPublic: e.target.checked })} />
                                                    <label className="form-check-label" htmlFor="isPublicToggle">
                                                        {formData.isPublic
                                                            ? 'Public — anyone can request to join'
                                                            : 'Private — only friends can request to join'}
                                                    </label>
                                                </div>
                                            </div>

                                            {/* ── Stops section ── */}
                                            <hr />
                                            <h6 className="fw-semibold mb-3">
                                                Trip Stops
                                                {stops.length > 0 && (
                                                    <span className="ms-2 badge bg-primary rounded-pill">{stops.length}</span>
                                                )}
                                            </h6>

                                            {/* Add stop form */}
                                            <div className="border rounded p-3 mb-3 bg-light">
                                                <div className="mb-2 position-relative">
                                                    <label className="form-label small fw-semibold mb-1">City *</label>
                                                    <input
                                                        type="text"
                                                        className={`form-control form-control-sm ${stopForm.selectedPlace ? 'is-valid' : ''}`}
                                                        placeholder={mapsLoaded ? 'Search US city...' : 'Maps loading...'}
                                                        disabled={!mapsLoaded}
                                                        value={cityQuery}
                                                        onKeyDown={stopEnterKey}
                                                        onChange={e => handleCityInput(e.target.value)}
                                                        autoComplete="off"
                                                    />
                                                    {citySuggestions.length > 0 && (
                                                        <ul className="list-group position-absolute w-100 shadow-sm"
                                                            style={{ zIndex: 9999, top: '100%', maxHeight: '180px', overflowY: 'auto' }}>
                                                            {citySuggestions.map(s => (
                                                                <li key={s.place_id}
                                                                    className="list-group-item list-group-item-action py-1 px-2 small"
                                                                    style={{ cursor: 'pointer' }}
                                                                    onMouseDown={e => { e.preventDefault(); handleSelectCity(s) }}>
                                                                    {s.description}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                                <div className="row g-2 mb-2">
                                                    <div className="col-4">
                                                        <label className="form-label small fw-semibold mb-1">Day *</label>
                                                        <input
                                                            type="number" min="1"
                                                            className="form-control form-control-sm"
                                                            placeholder="1"
                                                            value={stopForm.dayNumber}
                                                            onKeyDown={stopEnterKey}
                                                            onChange={e => setStopForm({ ...stopForm, dayNumber: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="col-8">
                                                        <label className="form-label small fw-semibold mb-1">Notes</label>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="Optional note"
                                                            value={stopForm.notes}
                                                            onKeyDown={stopEnterKey}
                                                            onChange={e => setStopForm({ ...stopForm, notes: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-primary w-100"
                                                    disabled={!stopForm.selectedPlace || !stopForm.dayNumber}
                                                    onClick={handleAddStop}>
                                                    + Add Stop
                                                </button>
                                            </div>

                                            {/* Stops list */}
                                            {stops.length === 0 ? (
                                                <p className="text-muted small text-center">No stops yet. Add cities above.</p>
                                            ) : (
                                                <div className="list-group">
                                                    {[...stops]
                                                        .sort((a, b) => a.dayNumber - b.dayNumber)
                                                        .map((stop, idx) => (
                                                            <div key={stop._key}
                                                                className="list-group-item d-flex align-items-center gap-2 py-2">
                                                                <span className="badge bg-primary rounded-circle flex-shrink-0"
                                                                    style={{ width: '22px', height: '22px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {idx + 1}
                                                                </span>
                                                                <div className="flex-grow-1 small">
                                                                    <span className="fw-semibold">{stop.city}</span>
                                                                    <span className="text-muted ms-2">Day {stop.dayNumber}</span>
                                                                    {stop.notes && <span className="text-muted fst-italic ms-2">· {stop.notes}</span>}
                                                                </div>
                                                                <button type="button" className="btn-close btn-sm"
                                                                    onClick={() => handleRemoveStop(stop._key)} />
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* ── Right panel: live map ── */}
                                        <div style={{ width: '58%' }}>
                                            {noApiKey
                                                ? mapPlaceholder('Set VITE_GOOGLE_MAPS_API_KEY to enable live map')
                                                : !mapsLoaded
                                                    ? mapPlaceholder('Loading map…')
                                                    : (
                                                        <GoogleMap
                                                            mapContainerStyle={{ width: '100%', height: '100%' }}
                                                            center={USA_CENTER}
                                                            zoom={4}
                                                            onLoad={m => { modalMapRef.current = m }}>
                                                            {renderMarkers(stops, modalDirections)}
                                                        </GoogleMap>
                                                    )}
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">
                                        {selectedTrip ? 'Save Changes' : 'Create Trip'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Delete Modal
            ══════════════════════════════════════════════════════════ */}
            {showDeleteModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button className="btn-close" onClick={() => setShowDeleteModal(false)} />
                            </div>
                            <div className="modal-body">
                                Are you sure you want to delete <strong>{tripToDelete?.title}</strong>?
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Detail / Map Modal
            ══════════════════════════════════════════════════════════ */}
            {showDetailModal && detailTrip && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <div>
                                    <h5 className="modal-title mb-0">{detailTrip.title}</h5>
                                    <small className="text-muted">by {detailTrip.username}</small>
                                </div>
                                <button className="btn-close" onClick={() => setShowDetailModal(false)} />
                            </div>
                            <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                                <div className="row g-4">
                                    {/* Left */}
                                    <div className="col-md-4">
                                        {detailTrip.description && <p className="text-muted small">{detailTrip.description}</p>}
                                        <div className="d-flex gap-2 flex-wrap mb-2">
                                            <span className={`badge ${detailTrip.status === 'CONFIRMED' ? 'bg-success' : 'bg-secondary'}`}>
                                                {detailTrip.status}
                                            </span>
                                            <span className={`badge ${detailTrip.isPublic ? 'bg-info text-dark' : 'bg-warning text-dark'}`}>
                                                {detailTrip.isPublic ? 'Public' : 'Private'}
                                            </span>
                                        </div>
                                        {(detailTrip.startDate || detailTrip.endDate) && (
                                            <p className="small mb-1">
                                                <span className="text-muted">{detailTrip.startDate || '?'} → {detailTrip.endDate || '?'}</span>
                                                {tripDuration(detailTrip.startDate, detailTrip.endDate) && (
                                                    <span className="ms-2 badge bg-light text-dark border">
                                                        {tripDuration(detailTrip.startDate, detailTrip.endDate)}
                                                    </span>
                                                )}
                                            </p>
                                        )}
                                        <p className="small text-muted mb-3">
                                            {detailTrip.memberCount ?? 0} member(s)
                                            {detailTrip.maxMembers ? ` / max ${detailTrip.maxMembers}` : ''}
                                        </p>

                                        {/* Join */}
                                        {detailTrip.username !== user?.username && (
                                            <div className="mb-3">
                                                {myMembership === null && (
                                                    <button className="btn btn-success btn-sm" onClick={handleJoinRequest}>Ask to Join</button>
                                                )}
                                                {myMembership?.status === 'PENDING'  && <span className="badge bg-warning text-dark px-3 py-2">Join request pending</span>}
                                                {myMembership?.status === 'ACCEPTED' && <span className="badge bg-success px-3 py-2">You are a member</span>}
                                                {myMembership?.status === 'DECLINED' && <span className="badge bg-danger px-3 py-2">Request declined</span>}
                                            </div>
                                        )}

                                        {/* Itinerary */}
                                        <h6 className="fw-semibold">Itinerary</h6>
                                        {stopsLoading ? (
                                            <p className="text-muted small">Loading stops…</p>
                                        ) : tripStops.length === 0 ? (
                                            <p className="text-muted small">No stops added yet.</p>
                                        ) : (() => {
                                            const grouped = groupByCity(tripStops)
                                            return (
                                                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                                                    {grouped.map((grp, idx) => (
                                                        <div key={`${grp.city}-${idx}`} className="d-flex mb-0">
                                                            <div className="d-flex flex-column align-items-center me-2">
                                                                <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                                                                    style={{ width: '22px', height: '22px', fontSize: '10px', fontWeight: 'bold' }}>
                                                                    {idx + 1}
                                                                </div>
                                                                {idx < grouped.length - 1 && (
                                                                    <div style={{ width: '2px', flex: 1, background: '#dee2e6', minHeight: '16px' }} />
                                                                )}
                                                            </div>
                                                            <div className="pb-3">
                                                                <div className="fw-semibold small">{grp.city}</div>
                                                                <div className="text-muted" style={{ fontSize: '11px' }}>Day {grp.dayLabel}</div>
                                                                {grp.notes && <div className="text-muted fst-italic" style={{ fontSize: '11px' }}>{grp.notes}</div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })()}
                                    </div>

                                    {/* Right: map */}
                                    <div className="col-md-8">
                                        {noApiKey ? (
                                            <div className="alert alert-info">
                                                Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable map.
                                            </div>
                                        ) : stopsLoading ? (
                                            <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ height: '460px' }}>
                                                <div className="spinner-border text-primary" />
                                            </div>
                                        ) : !mapsLoaded ? (
                                            <div className="d-flex align-items-center justify-content-center bg-light rounded" style={{ height: '460px' }}>
                                                <span className="text-muted">Loading map…</span>
                                            </div>
                                        ) : (
                                            <GoogleMap
                                                mapContainerStyle={{ width: '100%', height: '460px', borderRadius: '8px' }}
                                                center={USA_CENTER}
                                                zoom={4}
                                                onLoad={m => { detailMapRef.current = m }}>
                                                {renderMarkers(tripStops, detailDirections)}
                                            </GoogleMap>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════
                Pending Requests Modal
            ══════════════════════════════════════════════════════════ */}
            {showRequestsModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Join Requests — {requestsTrip?.title}</h5>
                                <button className="btn-close" onClick={() => setShowRequestsModal(false)} />
                            </div>
                            <div className="modal-body">
                                {pendingRequests.length === 0
                                    ? <p className="text-muted mb-0">No pending requests.</p>
                                    : <ul className="list-group list-group-flush">
                                        {pendingRequests.map(req => (
                                            <li key={req.id} className="list-group-item d-flex justify-content-between align-items-center px-0">
                                                <span className="fw-semibold">{req.username}</span>
                                                <div>
                                                    <button className="btn btn-sm btn-success me-2"
                                                        onClick={() => handleRespondToRequest(req.id, 'ACCEPTED')}>Accept</button>
                                                    <button className="btn btn-sm btn-danger"
                                                        onClick={() => handleRespondToRequest(req.id, 'DECLINED')}>Decline</button>
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
        </div>
    )
}

export default TripsPage
