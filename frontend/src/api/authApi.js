import api from './axiosConfig'

export const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return response.data
}

export const register = async (email, username, password, fullName) => {
    const response = await api.post('/auth/register', {
        email,
        username,
        password,
        fullName,
    })
    return response.data
}
