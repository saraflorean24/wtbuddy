import api from './axiosConfig'

export const getTrips = async (page = 0, size = 10, search = '') => {
    const params = { page, size }
    if (search) params.search = search
    const response = await api.get('/trips', { params })
    return response.data
}

export const getMyTrips = async (page = 0, size = 10, search = '') => {
    const params = { page, size }
    if (search) params.search = search
    const response = await api.get('/trips/my', { params })
    return response.data
}

export const getTripById = async (id) => {
    const response = await api.get(`/trips/${id}`)
    return response.data
}

export const getTripStops = async (tripId) => {
    const response = await api.get(`/trips/${tripId}/stops`)
    return response.data
}

export const createTrip = async (tripData) => {
    const response = await api.post('/trips', tripData)
    return response.data
}

export const updateTrip = async (id, tripData) => {
    const response = await api.put(`/trips/${id}`, tripData)
    return response.data
}

export const deleteTrip = async (id) => {
    await api.delete(`/trips/${id}`)
}

export const requestToJoin = async (tripId) => {
    const response = await api.post(`/trips/${tripId}/join`)
    return response.data
}

export const respondToJoinRequest = async (memberId, status) => {
    const response = await api.put(`/trips/members/${memberId}`, { status })
    return response.data
}

export const getPendingRequests = async (tripId) => {
    const response = await api.get(`/trips/${tripId}/requests`)
    return response.data
}

export const replaceStops = async (tripId, stops) => {
    const response = await api.put(`/trips/${tripId}/stops`, stops)
    return response.data
}

export const getTripMembers = async (tripId) => {
    const response = await api.get(`/trips/${tripId}/members`)
    return response.data
}

export const getMyMembership = async (tripId) => {
    const response = await api.get(`/trips/${tripId}/my-membership`, {
        validateStatus: (s) => s === 200 || s === 204,
    })
    return response.status === 200 ? response.data : null
}

export const cancelOrLeave = async (memberId) => {
    await api.delete(`/trips/members/${memberId}`)
}

export const getDeclinedRequests = async (tripId) => {
    const response = await api.get(`/trips/${tripId}/declined`)
    return response.data
}

export const reinviteUser = async (memberId) => {
    const response = await api.post(`/trips/members/${memberId}/reinvite`)
    return response.data
}

export const acceptInvitation = async (memberId) => {
    const response = await api.post(`/trips/members/${memberId}/accept-invite`)
    return response.data
}

export const declineInvitation = async (memberId) => {
    await api.post(`/trips/members/${memberId}/decline-invite`)
}

export const subscribeToSpot = async (tripId) => {
    await api.post(`/trips/${tripId}/subscribe`)
}

export const unsubscribeFromSpot = async (tripId) => {
    await api.delete(`/trips/${tripId}/subscribe`)
}

export const isSubscribedToSpot = async (tripId) => {
    const response = await api.get(`/trips/${tripId}/subscribe`)
    return response.data
}
