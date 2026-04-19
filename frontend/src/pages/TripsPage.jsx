import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/useAuth'
import { useSearchParams } from 'react-router-dom'
import {
    GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, InfoWindow,
} from '@react-google-maps/api'
import {
    getTrips, getMyTrips, getTripById, createTrip, updateTrip, deleteTrip,
    getTripStops, replaceStops, requestToJoin, respondToJoinRequest,
    getPendingRequests, getMyMembership, getTripMembers,
    cancelOrLeave, subscribeToSpot, unsubscribeFromSpot, isSubscribedToSpot,
    getDeclinedRequests, reinviteUser, acceptInvitation, declineInvitation,
} from '../api/tripApi'

const MAPS_LIBRARIES = ['places']
const MAPS_API_KEY   = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
const USA_CENTER     = { lat: 39.8283, lng: -98.5795 }
const EMPTY_STOP     = { selectedPlace: null, dayNumber: '', notes: '' }

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

const sortedForRoute = (arr) => groupByCity(arr)

function TripsPage() {
    const { user } = useAuth()
    const [searchParams] = useSearchParams()

    const [trips,       setTrips]       = useState([])
    const [totalPages,  setTotalPages]  = useState(0)
    const [currentPage, setCurrentPage] = useState(0)
    const [search,      setSearch]      = useState('')
    const [loading,     setLoading]     = useState(false)
    const [error,       setError]       = useState('')
    const [viewMode,    setViewMode]    = useState('all')

    const [showModal,    setShowModal]   = useState(false)
    const [selectedTrip, setSelectedTrip] = useState(null)
    const [formData, setFormData] = useState({
        title: '', description: '', startDate: '', endDate: '',
        isPublic: false, maxMembers: '', status: 'DRAFT',
    })
    const [stops,         setStops]         = useState([])
    const [stopsModified, setStopsModified] = useState(false)
    const [stopForm,      setStopForm]      = useState(EMPTY_STOP)

    const [cityQuery,       setCityQuery]       = useState('')
    const [citySuggestions, setCitySuggestions] = useState([])
    const autocompleteServiceRef = useRef(null)

    const modalMapRef       = useRef(null)
    const [modalDirections, setModalDirections] = useState(null)

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [tripToDelete,    setTripToDelete]    = useState(null)

    const [showDetailModal, setShowDetailModal] = useState(false)
    const [detailTrip,      setDetailTrip]      = useState(null)
    const [tripStops,       setTripStops]       = useState([])
    const [stopsLoading,    setStopsLoading]    = useState(false)
    const [myMembership,    setMyMembership]    = useState(null)
    const [activeMarker,    setActiveMarker]    = useState(null)
    const [tripMembers,     setTripMembers]     = useState([])
    const [isSubscribed,    setIsSubscribed]    = useState(false)
    const [subscribeLoading, setSubscribeLoading] = useState(false)

    const detailMapRef       = useRef(null)
    const [detailDirections, setDetailDirections] = useState(null)

    const [showRequestsModal, setShowRequestsModal] = useState(false)
    const [requestsTrip,      setRequestsTrip]      = useState(null)
    const [pendingRequests,   setPendingRequests]   = useState([])
    const [declinedRequests,  setDeclinedRequests]  = useState([])

    const { isLoaded: mapsLoaded } = useJsApiLoader({
        googleMapsApiKey: MAPS_API_KEY,
        libraries: MAPS_LIBRARIES,
    })

    useEffect(() => { fetchTrips() }, [currentPage, search, viewMode])

    // Auto-open detail modal when navigated from dashboard with ?open=id
    useEffect(() => {
        const openId = searchParams.get('open')
        if (!openId) return
        getTripById(Number(openId))
            .then(trip => handleOpenDetail(trip))
            .catch(() => {})
    }, [])

    useEffect(() => {
        if (!mapsLoaded || !window.google) return
        computeRoute(stops, setModalDirections)
    }, [stops, mapsLoaded])

    useEffect(() => {
        if (!modalMapRef.current || !window.google) return
        fitBounds(modalMapRef.current, stops.filter(s => s.lat != null && s.lng != null))
    }, [stops])

    useEffect(() => {
        if (!mapsLoaded || !window.google) return
        computeRoute(tripStops, setDetailDirections)
    }, [tripStops, mapsLoaded])

    useEffect(() => {
        if (!detailMapRef.current || !window.google) return
        fitBounds(detailMapRef.current, tripStops.filter(s => s.lat != null && s.lng != null))
    }, [tripStops])

    const computeRoute = (stopsArr, setDir) => {
        const ordered = sortedForRoute(stopsArr)
        if (ordered.length < 2) { setDir(null); return }
        new window.google.maps.DirectionsService().route(
            {
                origin:      { lat: ordered[0].lat, lng: ordered[0].lng },
                destination: { lat: ordered[ordered.length - 1].lat, lng: ordered[ordered.length - 1].lng },
                waypoints:   ordered.slice(1, -1).map(s => ({ location: { lat: s.lat, lng: s.lng }, stopover: true })),
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

    const handleOpenCreate = () => {
        setSelectedTrip(null)
        setFormData({ title: '', description: '', startDate: '', endDate: '', isPublic: false, maxMembers: '', status: 'DRAFT' })
        setStops([]); setStopsModified(false); setStopForm(EMPTY_STOP)
        setCityQuery(''); setCitySuggestions([]); setModalDirections(null)
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
        setStops([]); setStopsModified(false); setStopForm(EMPTY_STOP)
        setCityQuery(''); setCitySuggestions([]); setModalDirections(null)
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
        setCityQuery(''); setCitySuggestions([]); setStopForm(EMPTY_STOP)
    }

    const handleRemoveStop = (key) => {
        setStops(prev => prev.filter(s => s._key !== key).map((s, i) => ({ ...s, orderIndex: i + 1 })))
        setStopsModified(true)
    }

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

    const handleOpenDelete = (trip) => { setTripToDelete(trip); setShowDeleteModal(true) }

    const handleDelete = async () => {
        try { await deleteTrip(tripToDelete.id); setShowDeleteModal(false); fetchTrips() }
        catch { setError('Failed to delete trip') }
    }

    const handleOpenDetail = async (trip) => {
        setDetailTrip(trip); setTripStops([]); setDetailDirections(null)
        setMyMembership(null); setActiveMarker(null); setTripMembers([])
        setIsSubscribed(false); setShowDetailModal(true)
        setStopsLoading(true)
        try {
            const isOwner = trip.username === user?.username
            const [stopsRes, memberRes, membersRes, subRes] = await Promise.allSettled([
                getTripStops(trip.id),
                isOwner ? Promise.resolve(null) : getMyMembership(trip.id),
                isOwner ? getTripMembers(trip.id) : Promise.resolve([]),
                isOwner ? Promise.resolve(false) : isSubscribedToSpot(trip.id),
            ])
            if (stopsRes.status === 'fulfilled')   setTripStops(stopsRes.value)
            if (memberRes.status === 'fulfilled')  setMyMembership(memberRes.value)
            if (membersRes.status === 'fulfilled') setTripMembers(membersRes.value)
            if (subRes.status === 'fulfilled')     setIsSubscribed(subRes.value)
        } finally { setStopsLoading(false) }
    }

    const handleJoinRequest = async () => {
        try { setMyMembership(await requestToJoin(detailTrip.id)) }
        catch (err) { setError(err.response?.data?.message || 'Failed to send join request') }
    }

    const handleLeave = async () => {
        if (!myMembership) return
        try {
            await cancelOrLeave(myMembership.id)
            setMyMembership(null)
            fetchTrips()
        } catch (err) { setError(err.response?.data?.message || 'Failed to leave trip') }
    }

    const handleSubscribeToggle = async () => {
        setSubscribeLoading(true)
        try {
            if (isSubscribed) {
                await unsubscribeFromSpot(detailTrip.id)
                setIsSubscribed(false)
            } else {
                await subscribeToSpot(detailTrip.id)
                setIsSubscribed(true)
            }
        } catch (err) { setError(err.response?.data?.message || 'Failed to update subscription') }
        finally { setSubscribeLoading(false) }
    }

    const handleOpenRequests = async (trip) => {
        setRequestsTrip(trip); setPendingRequests([]); setDeclinedRequests([]); setShowRequestsModal(true)
        try {
            const [pending, declined] = await Promise.all([
                getPendingRequests(trip.id),
                getDeclinedRequests(trip.id),
            ])
            setPendingRequests(pending)
            setDeclinedRequests(declined)
        } catch { setError('Failed to load requests') }
    }

    const handleRespondToRequest = async (memberId, status) => {
        try {
            await respondToJoinRequest(memberId, status)
            setPendingRequests(prev => prev.filter(r => r.id !== memberId))
            if (status === 'DECLINED') {
                const updated = await getDeclinedRequests(requestsTrip.id)
                setDeclinedRequests(updated)
            }
            fetchTrips()
        } catch (err) { setError(err.response?.data?.message || 'Failed to respond to request') }
    }

    const handleReinvite = async (memberId) => {
        try {
            await reinviteUser(memberId)
            setDeclinedRequests(prev => prev.filter(r => r.id !== memberId))
        } catch (err) { setError(err.response?.data?.message || 'Failed to send invitation') }
    }

    const handleAcceptInvitation = async () => {
        try {
            const updated = await acceptInvitation(myMembership.id)
            setMyMembership(updated)
            fetchTrips()
        } catch (err) { setError(err.response?.data?.message || 'Failed to accept invitation') }
    }

    const handleDeclineInvitation = async () => {
        try {
            await declineInvitation(myMembership.id)
            setMyMembership(null)
        } catch (err) { setError(err.response?.data?.message || 'Failed to decline invitation') }
    }

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
        <div className="flex items-center justify-center bg-gray-100 rounded h-full text-gray-400 text-sm">{msg}</div>
    )

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold m-0">Trips</h2>
                    <div className="btn-group">
                        <button className={`btn btn-sm ${viewMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setViewMode('all'); setCurrentPage(0) }}>All Trips</button>
                        <button className={`btn btn-sm ${viewMode === 'my' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => { setViewMode('my'); setCurrentPage(0) }}>My Trips</button>
                    </div>
                </div>
                <button className="btn btn-primary btn-md" onClick={handleOpenCreate}>+ Add Trip</button>
            </div>

            {error && (
                <div className="alert alert-danger justify-between">
                    <span>{error}</span>
                    <button className="btn-close text-red-700" onClick={() => setError('')}>×</button>
                </div>
            )}

            <div className="mb-4">
                <input type="text" className="form-control" placeholder="Search trips..."
                    value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(0) }} />
            </div>

            {/* Table */}
            {loading ? <div className="text-center py-8 text-gray-400">Loading...</div> : (
                <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Title</th><th>Start</th><th>End</th><th>Duration</th>
                                <th>Status</th><th>Members</th><th>Organizer</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trips.length === 0
                                ? <tr><td colSpan="8" className="text-center text-gray-400 py-8">No trips found</td></tr>
                                : trips.map(trip => (
                                    <tr key={trip.id}>
                                        <td>
                                            <button className="btn btn-link p-0 font-semibold"
                                                onClick={() => handleOpenDetail(trip)}>{trip.title}</button>
                                            {trip.description && (
                                                <div className="text-gray-500 text-xs mt-0.5 mx-auto" style={{ maxWidth: '220px' }}>
                                                    {trip.description.length > 70
                                                        ? trip.description.slice(0, 70) + '…'
                                                        : trip.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="text-gray-600 whitespace-nowrap">{trip.startDate || '-'}</td>
                                        <td className="text-gray-600 whitespace-nowrap">{trip.endDate || '-'}</td>
                                        <td className="text-gray-600 whitespace-nowrap">{tripDuration(trip.startDate, trip.endDate) || '-'}</td>
                                        <td>
                                            <span className={`badge ${trip.status === 'CONFIRMED' ? 'badge-success' : 'badge-secondary'}`}>
                                                {trip.status}
                                            </span>
                                        </td>
                                        <td className="text-gray-600">{trip.memberCount ?? 0}{trip.maxMembers ? `/${trip.maxMembers}` : ''}</td>
                                        <td className="text-gray-600">{trip.username}</td>
                                        <td>
                                            <div className="flex gap-1 flex-wrap">
                                                <button className="btn btn-outline-primary btn-sm"
                                                    onClick={() => handleOpenDetail(trip)}>View</button>
                                                {trip.username === user?.username && <>
                                                    <button className="btn btn-warning btn-sm"
                                                        onClick={() => handleOpenEdit(trip)}>Edit</button>
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={() => handleOpenDelete(trip)}>Delete</button>
                                                    <button className="btn btn-info btn-sm"
                                                        onClick={() => handleOpenRequests(trip)}>Requests</button>
                                                </>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
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

            {/* ══ Create / Edit Modal ══ */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-xl" style={{ height: '90vh' }}>
                        <div className="modal-header">
                            <h5 className="text-base font-semibold m-0">{selectedTrip ? 'Edit Trip' : 'Add Trip'}</h5>
                            <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex flex-1 overflow-hidden">

                                {/* Left panel */}
                                <div className="p-5 border-r border-gray-200 overflow-y-auto" style={{ width: '42%' }}>
                                    <div className="mb-4">
                                        <label className="form-label">Title *</label>
                                        <input type="text" className="form-control" required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    </div>
                                    <div className="mb-4">
                                        <label className="form-label">Description</label>
                                        <textarea className="form-control" rows="2"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })} />
                                    </div>
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex-1">
                                            <label className="form-label">Start Date</label>
                                            <input type="date" className="form-control"
                                                value={formData.startDate}
                                                onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                                        </div>
                                        <div className="flex-1">
                                            <label className="form-label">End Date</label>
                                            <input type="date" className="form-control"
                                                value={formData.endDate}
                                                onChange={e => setFormData({ ...formData, endDate: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mb-4">
                                        <div className="flex-1">
                                            <label className="form-label">Max Members</label>
                                            <input type="number" className="form-control"
                                                value={formData.maxMembers}
                                                onChange={e => setFormData({ ...formData, maxMembers: e.target.value })} />
                                        </div>
                                        {selectedTrip && (
                                            <div className="flex-1">
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
                                    <div className="mb-5 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="isPublicToggle"
                                            className="w-4 h-4 accent-violet-600 cursor-pointer"
                                            checked={formData.isPublic}
                                            onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                        />
                                        <label htmlFor="isPublicToggle" className="text-sm text-gray-700 cursor-pointer">
                                            {formData.isPublic
                                                ? 'Public — anyone can request to join'
                                                : 'Private — only friends can request to join'}
                                        </label>
                                    </div>

                                    {/* Stops section */}
                                    <hr className="my-4" />
                                    <h6 className="font-semibold mb-3 flex items-center gap-2">
                                        Trip Stops
                                        {stops.length > 0 && (
                                            <span className="badge badge-primary rounded-full">{stops.length}</span>
                                        )}
                                    </h6>

                                    {/* Add stop form */}
                                    <div className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
                                        <div className="mb-2 relative">
                                            <label className="form-label text-xs font-semibold">City *</label>
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
                                                <ul className="absolute w-full z-[9999] top-full bg-white border border-gray-200 rounded shadow-sm overflow-y-auto"
                                                    style={{ maxHeight: '180px' }}>
                                                    {citySuggestions.map(s => (
                                                        <li key={s.place_id}
                                                            className="px-3 py-1.5 text-sm hover:bg-violet-50 cursor-pointer border-b border-gray-100 last:border-0"
                                                            onMouseDown={e => { e.preventDefault(); handleSelectCity(s) }}>
                                                            {s.description}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <div style={{ width: '35%' }}>
                                                <label className="form-label text-xs font-semibold">Day *</label>
                                                <input
                                                    type="number" min="1"
                                                    className="form-control form-control-sm"
                                                    placeholder="1"
                                                    value={stopForm.dayNumber}
                                                    onKeyDown={stopEnterKey}
                                                    onChange={e => setStopForm({ ...stopForm, dayNumber: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="form-label text-xs font-semibold">Notes</label>
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
                                            className="btn btn-primary btn-sm w-full"
                                            disabled={!stopForm.selectedPlace || !stopForm.dayNumber}
                                            onClick={handleAddStop}>
                                            + Add Stop
                                        </button>
                                    </div>

                                    {/* Stops list */}
                                    {stops.length === 0 ? (
                                        <p className="text-gray-400 text-sm text-center">No stops yet. Add cities above.</p>
                                    ) : (
                                        <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
                                            {[...stops]
                                                .sort((a, b) => a.dayNumber - b.dayNumber)
                                                .map((stop, idx) => (
                                                    <div key={stop._key}
                                                        className="flex items-center gap-2 py-2 px-3">
                                                        <span className="badge badge-primary rounded-full flex-shrink-0 w-5 h-5 text-[10px]">
                                                            {idx + 1}
                                                        </span>
                                                        <div className="flex-1 text-sm">
                                                            <span className="font-semibold">{stop.city}</span>
                                                            <span className="text-gray-400 ml-2">Day {stop.dayNumber}</span>
                                                            {stop.notes && <span className="text-gray-400 italic ml-2">· {stop.notes}</span>}
                                                        </div>
                                                        <button type="button" className="btn-close text-sm"
                                                            onClick={() => handleRemoveStop(stop._key)}>×</button>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right panel: map */}
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
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary btn-md" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-md">
                                    {selectedTrip ? 'Save Changes' : 'Create Trip'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ Delete Modal ══ */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-md">
                        <div className="modal-header">
                            <h5 className="text-base font-semibold m-0">Confirm Delete</h5>
                            <button className="btn-close" onClick={() => setShowDeleteModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            Are you sure you want to delete <strong>{tripToDelete?.title}</strong>?
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary btn-md" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                            <button className="btn btn-danger btn-md" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Detail / Map Modal ══ */}
            {showDetailModal && detailTrip && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-xl">
                        <div className="modal-header">
                            <div>
                                <h5 className="text-base font-semibold m-0">{detailTrip.title}</h5>
                                <small className="text-gray-500">by {detailTrip.username}</small>
                            </div>
                            <button className="btn-close" onClick={() => setShowDetailModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="flex flex-col md:flex-row gap-5">
                                {/* Left */}
                                <div className="md:w-1/3">
                                    {detailTrip.description && <p className="text-gray-500 text-sm mb-3">{detailTrip.description}</p>}
                                    <div className="flex gap-2 flex-wrap mb-2">
                                        <span className={`badge ${detailTrip.status === 'CONFIRMED' ? 'badge-success' : 'badge-secondary'}`}>
                                            {detailTrip.status}
                                        </span>
                                        <span className={`badge ${detailTrip.isPublic ? 'badge-info' : 'badge-warning'}`}>
                                            {detailTrip.isPublic ? 'Public' : 'Private'}
                                        </span>
                                    </div>
                                    {(detailTrip.startDate || detailTrip.endDate) && (
                                        <p className="text-sm mb-1">
                                            <span className="text-gray-500">{detailTrip.startDate || '?'} → {detailTrip.endDate || '?'}</span>
                                            {tripDuration(detailTrip.startDate, detailTrip.endDate) && (
                                                <span className="ml-2 badge badge-light">
                                                    {tripDuration(detailTrip.startDate, detailTrip.endDate)}
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    <p className="text-sm text-gray-500 mb-4">
                                        {detailTrip.memberCount ?? 0} member(s)
                                        {detailTrip.maxMembers ? ` / max ${detailTrip.maxMembers}` : ''}
                                    </p>

                                    {/* Join */}
                                    {detailTrip.username !== user?.username && (() => {
                                        const isFull = detailTrip.maxMembers != null &&
                                            (detailTrip.memberCount ?? 0) >= detailTrip.maxMembers
                                        // DECLINED with declinedByOwner=false = was auto-declined → treat as no membership
                                        const effectiveMembership = (myMembership?.status === 'DECLINED' && !myMembership?.declinedByOwner)
                                            ? null
                                            : myMembership
                                        return (
                                            <div className="mb-4 space-y-2">
                                                {effectiveMembership === null && !isFull && (
                                                    <button className="btn btn-success btn-sm" onClick={handleJoinRequest}>
                                                        Ask to Join
                                                    </button>
                                                )}
                                                {effectiveMembership === null && isFull && (
                                                    <div className="flex flex-col gap-2">
                                                        <button className="btn btn-secondary btn-sm cursor-not-allowed opacity-70" disabled>
                                                            No more places
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm ${isSubscribed ? 'btn-outline-danger' : 'btn-outline-primary'}`}
                                                            onClick={handleSubscribeToggle}
                                                            disabled={subscribeLoading}>
                                                            {subscribeLoading
                                                                ? '...'
                                                                : isSubscribed
                                                                    ? 'Unsubscribe from notifications'
                                                                    : 'Notify me when a spot opens'}
                                                        </button>
                                                        {isSubscribed && (
                                                            <p className="text-xs text-gray-500">
                                                                You'll be notified when a spot becomes available.
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                {effectiveMembership?.status === 'PENDING' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-warning px-3 py-1.5">Join request pending</span>
                                                        <button className="btn btn-outline-danger btn-sm" onClick={handleLeave}>Cancel</button>
                                                    </div>
                                                )}
                                                {effectiveMembership?.status === 'ACCEPTED' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-success px-3 py-1.5">You are a member</span>
                                                        <button className="btn btn-outline-danger btn-sm" onClick={handleLeave}>Leave</button>
                                                    </div>
                                                )}
                                                {effectiveMembership?.status === 'INVITED' && (
                                                    <div className="flex flex-col gap-2">
                                                        <p className="text-sm font-semibold text-violet-700">
                                                            You've been invited to join this trip!
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <button className="btn btn-success btn-sm" onClick={handleAcceptInvitation}>
                                                                Accept
                                                            </button>
                                                            <button className="btn btn-outline-danger btn-sm" onClick={handleDeclineInvitation}>
                                                                Decline
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                {effectiveMembership?.status === 'DECLINED' && (
                                                    <span className="badge badge-danger px-3 py-1.5">Request declined</span>
                                                )}
                                            </div>
                                        )
                                    })()}

                                    {/* Members (owner only) */}
                                    {detailTrip.username === user?.username && (
                                        <div className="mb-4">
                                            <h6 className="font-semibold text-sm mb-2">Members ({tripMembers.length})</h6>
                                            {tripMembers.length === 0 ? (
                                                <p className="text-gray-400 text-sm">No accepted members yet.</p>
                                            ) : (
                                                <ul className="divide-y divide-gray-100">
                                                    {tripMembers.map(m => (
                                                        <li key={m.id} className="py-1.5 text-sm flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16" className="text-gray-400 flex-shrink-0">
                                                                <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4z"/>
                                                            </svg>
                                                            {m.username}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}

                                    {/* Itinerary */}
                                    <h6 className="font-semibold text-sm mb-2">Itinerary</h6>
                                    {stopsLoading ? (
                                        <p className="text-gray-400 text-sm">Loading stops…</p>
                                    ) : tripStops.length === 0 ? (
                                        <p className="text-gray-400 text-sm">No stops added yet.</p>
                                    ) : (() => {
                                        const grouped = groupByCity(tripStops)
                                        return (
                                            <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                                                {grouped.map((grp, idx) => (
                                                    <div key={`${grp.city}-${idx}`} className="flex mb-0">
                                                        <div className="flex flex-col items-center mr-2">
                                                            <div className="rounded-full bg-violet-600 text-white flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                                                                style={{ width: '22px', height: '22px' }}>
                                                                {idx + 1}
                                                            </div>
                                                            {idx < grouped.length - 1 && (
                                                                <div className="w-0.5 flex-1 bg-gray-200 min-h-4" />
                                                            )}
                                                        </div>
                                                        <div className="pb-3">
                                                            <div className="font-semibold text-sm">{grp.city}</div>
                                                            <div className="text-gray-400 text-xs">Day {grp.dayLabel}</div>
                                                            {grp.notes && <div className="text-gray-400 italic text-xs">{grp.notes}</div>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                </div>

                                {/* Right: map */}
                                <div className="md:w-2/3">
                                    {noApiKey ? (
                                        <div className="bg-blue-50 text-blue-700 text-sm rounded p-3 mb-2">
                                            Set <code>VITE_GOOGLE_MAPS_API_KEY</code> to enable map.
                                        </div>
                                    ) : stopsLoading ? (
                                        <div className="flex items-center justify-center bg-gray-100 rounded" style={{ height: '460px' }}>
                                            <div className="text-gray-400">Loading…</div>
                                        </div>
                                    ) : !mapsLoaded ? (
                                        <div className="flex items-center justify-center bg-gray-100 rounded" style={{ height: '460px' }}>
                                            <span className="text-gray-400">Loading map…</span>
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
                            <button className="btn btn-secondary btn-md" onClick={() => setShowDetailModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ══ Pending Requests Modal ══ */}
            {showRequestsModal && (
                <div className="modal-overlay">
                    <div className="modal-box modal-box-md">
                        <div className="modal-header">
                            <h5 className="text-base font-semibold m-0">Join Requests — {requestsTrip?.title}</h5>
                            <button className="btn-close" onClick={() => setShowRequestsModal(false)}>×</button>
                        </div>
                        <div className="modal-body space-y-4">
                            <div>
                                <h6 className="font-semibold text-sm text-gray-700 mb-2">
                                    Pending ({pendingRequests.length})
                                </h6>
                                {pendingRequests.length === 0
                                    ? <p className="text-gray-400 text-sm mb-0">No pending requests.</p>
                                    : <ul className="divide-y divide-gray-100">
                                        {pendingRequests.map(req => (
                                            <li key={req.id} className="flex justify-between items-center py-3">
                                                <span className="font-semibold">{req.username}</span>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-success btn-sm"
                                                        onClick={() => handleRespondToRequest(req.id, 'ACCEPTED')}>Accept</button>
                                                    <button className="btn btn-danger btn-sm"
                                                        onClick={() => handleRespondToRequest(req.id, 'DECLINED')}>Decline</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>}
                            </div>

                            {declinedRequests.length > 0 && (
                                <div>
                                    <hr className="my-2" />
                                    <h6 className="font-semibold text-sm text-gray-700 mb-2">
                                        Declined ({declinedRequests.length})
                                    </h6>
                                    <ul className="divide-y divide-gray-100">
                                        {declinedRequests.map(req => (
                                            <li key={req.id} className="flex justify-between items-center py-3">
                                                <span className="font-semibold text-gray-500">{req.username}</span>
                                                <button className="btn btn-outline-primary btn-sm"
                                                    onClick={() => handleReinvite(req.id)}>
                                                    Re-invite
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary btn-md" onClick={() => setShowRequestsModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default TripsPage
