import api from './axiosConfig'

export const sendFriendRequest = async (addresseeId) => {
    const response = await api.post('/friendships', { addresseeId })
    return response.data
}

export const getFriends = async () => {
    const response = await api.get('/friendships/friends')
    return response.data
}

export const getPendingFriendRequests = async () => {
    const response = await api.get('/friendships/pending')
    return response.data
}

export const updateFriendshipStatus = async (friendshipId, status) => {
    const response = await api.put(`/friendships/${friendshipId}`, { status })
    return response.data
}

export const deleteFriendship = async (friendshipId) => {
    await api.delete(`/friendships/${friendshipId}`)
}
