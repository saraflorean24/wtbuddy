import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import SetupProfilePage from './pages/SetupProfilePage'
import EventsPage from './pages/EventsPage'
import TripsPage from './pages/TripsPage'
import NotificationsPage from './pages/NotificationsPage.jsx'
import FeedbackPage from './pages/FeedbackPage.jsx'

// Requires login. If profile is not yet complete, locks user to /setup-profile.
const ProtectedRoute = ({ children }) => {
    const { token, user } = useAuth()
    if (!token) return <Navigate to="/login" />
    if (!user?.profileComplete) return <Navigate to="/setup-profile" />
    return children
}

function App() {
    const { token, user } = useAuth()
    const { pathname } = useLocation()

    const isPublicPage = ['/', '/login', '/register', '/setup-profile'].includes(pathname)

    return (
        <>
            {token && !isPublicPage && <Navbar />}
            <div className={token && !isPublicPage ? 'w-full px-4 mt-6' : ''}>
                <Routes>
                    <Route path="/" element={token ? <Navigate to="/events" /> : <HomePage />} />
                    <Route path="/login" element={token ? <Navigate to="/events" /> : <LoginPage />} />
                    <Route path="/register" element={token ? <Navigate to="/events" /> : <RegisterPage />} />
                    <Route path="/setup-profile" element={
                        !token
                            ? <Navigate to="/login" />
                            : user?.profileComplete
                                ? <Navigate to="/events" />
                                : <SetupProfilePage />
                    } />
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
