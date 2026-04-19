import { createContext, useState } from 'react'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'))
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user')
            return stored ? JSON.parse(stored) : null
        } catch {
            localStorage.removeItem('user')
            return null
        }
    })

    const login = (userData, userToken) => {
        localStorage.setItem('token', userToken)
        localStorage.setItem('user', JSON.stringify(userData))
        setToken(userToken)
        setUser(userData)
    }

    const logout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    const completeProfile = () => {
        const updated = { ...user, profileComplete: true }
        localStorage.setItem('user', JSON.stringify(updated))
        setUser(updated)
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, completeProfile }}>
            {children}
        </AuthContext.Provider>
    )
}
