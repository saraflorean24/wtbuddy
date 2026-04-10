import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUnreadCount } from '../api/notificationApi'

function Navbar() {
    const { logout, user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [unreadCount, setUnreadCount] = useState(0)
    const intervalRef = useRef(null)

    useEffect(() => {
        fetchUnreadCount()
        intervalRef.current = setInterval(fetchUnreadCount, 30000)
        return () => clearInterval(intervalRef.current)
    }, [])

    // Refresh count when navigating to/from feedback page
    useEffect(() => {
        fetchUnreadCount()
    }, [location.pathname])

    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadCount()
            setUnreadCount(count)
        } catch {
            // silently ignore
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const navLink = (to, label) => {
        const active = location.pathname === to
        return (
            <Link className={`nav-link ${active ? 'active fw-semibold' : ''}`} to={to}>
                {label}
            </Link>
        )
    }

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link className="navbar-brand fw-bold" to="/">WTBuddy</Link>
                <div className="navbar-nav me-auto">
                    {navLink('/events', 'Events')}
                    {navLink('/trips', 'Trips')}
                    <Link
                        className={`nav-link position-relative ${location.pathname === '/feedback' ? 'active fw-semibold' : ''}`}
                        to="/feedback">
                        Notifications
                        {unreadCount > 0 && (
                            <span
                                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                style={{ fontSize: '10px' }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </Link>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span className="text-light small">
                        <span className="me-1">👤</span>{user?.username}
                    </span>
                    <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
