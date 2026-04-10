import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import EventsPage from './pages/EventsPage'
import TripsPage from './pages/TripsPage'
import NotificationsPage from './pages/NotificationsPage.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'

const ProtectedRoute = ({ children }) => {
    const { token } = useAuth()
    return token ? children : <Navigate to="/login" />
}

function App() {
    const { token } = useAuth()
    const { pathname } = useLocation()

    const isPublicPage = ['/', '/login', '/register'].includes(pathname)

    return (
        <>
            {token && !isPublicPage && <Navbar />}
            <div className={token && !isPublicPage ? 'w-full px-4 mt-6' : ''}>
                <Routes>
                    <Route path="/" element={token ? <Navigate to="/events" /> : <HomePage />} />
                    <Route path="/login" element={token ? <Navigate to="/events" /> : <LoginPage />} />
                    <Route path="/register" element={token ? <Navigate to="/events" /> : <RegisterPage />} />
                    <Route path="/events" element={
                        <ProtectedRoute><EventsPage /></ProtectedRoute>
                    } />
                    <Route path="/trips" element={
                        <ProtectedRoute><TripsPage /></ProtectedRoute>
                    } />
                    <Route path="/notifications" element={
                        <ProtectedRoute><NotificationsPage /></ProtectedRoute>
                    } />
                    <Route path="/feedback" element={
                        <ProtectedRoute><FeedbackPage /></ProtectedRoute>
                    } />
                </Routes>
            </div>
        </>
    )
}

export default App
