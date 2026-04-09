import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const ProtectedRoute = ({ children }) => {
    const { token } = useAuth()
    return token ? children : <Navigate to="/login" />
}

function App() {
    const { token } = useAuth()

    return (
        <div>
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
        </div>
    )
}

export default App