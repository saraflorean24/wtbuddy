import api from './axiosConfig'

export const submitFeedback = async (data) => {
    const response = await api.post('/feedback', data)
    return response.data
}

export const getMyFeedback = async (page = 0, size = 10) => {
    const response = await api.get('/feedback/my', { params: { page, size } })
    return response.data
}

export const getAllFeedback = async (page = 0, size = 20) => {
    const response = await api.get('/feedback', { params: { page, size } })
    return response.data
}

export const getPublicTestimonials = async () => {
    const response = await api.get('/feedback/public')
    return response.data
}
