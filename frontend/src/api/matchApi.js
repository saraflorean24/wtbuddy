import api from './axiosConfig'

export const generateSuggestions = async () => {
    const response = await api.post('/matches/generate')
    return response.data
}

export const getSuggestions = async (page = 0, size = 10) => {
    const response = await api.get('/matches', { params: { page, size } })
    return response.data
}

export const dismissSuggestion = async (id) => {
    await api.put(`/matches/${id}/dismiss`)
}
