import api from './axiosConfig'

export const getEvents = async (page = 0, size = 10, search = '') => {
    const params = { page, size }
    if (search) params.search = search
    const response = await api.get('/events', { params })
    return response.data
}

export const getEventById = async (id) => {
    const response = await api.get(`/events/${id}`)
    return response.data
}

export const createEvent = async (eventData) => {
    const response = await api.post('/events', eventData)
    return response.data
}

export const updateEvent = async (id, eventData) => {
    const response = await api.put(`/events/${id}`, eventData)
    return response.data
}

export const deleteEvent = async (id) => {
    await api.delete(`/events/${id}`)
}

export const joinEvent = async (id) => {
    const response = await api.post(`/events/${id}/join`)
    return response.data
}

export const leaveEvent = async (id) => {
    await api.delete(`/events/${id}/leave`)
}

export const getPendingParticipants = async (eventId) => {
    const response = await api.get(`/events/${eventId}/requests`)
    return response.data
}

export const respondToParticipant = async (participantId, status) => {
    const response = await api.put(`/events/participants/${participantId}`, { status })
    return response.data
}