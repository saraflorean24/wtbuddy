import api from './axiosConfig'

export const updateProfile = async (userId, profileData) => {
    const response = await api.put(`/users/${userId}/profile`, profileData)
    return response.data
}

export const getMyInterests = async () => {
    const response = await api.get('/interests/me')
    return response.data
}

export const getAllInterests = async () => {
    const response = await api.get('/interests')
    return response.data
}

export const addInterest = async (interestId) => {
    const response = await api.post('/interests/me', { interestId })
    return response.data
}

export const removeInterest = async (interestId) => {
    await api.delete(`/interests/me/${interestId}`)
}
