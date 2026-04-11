import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [token, setToken] = useState(localStorage.getItem('token'))

    useEffect(() => {
        if (token) {
            const userData = localStorage.getItem('user')
            if (userData) setUser(JSON.parse(userData))
        } else {
            setUser(null)
        }
    }, [token])

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

export const useAuth = () => useContext(AuthContext)