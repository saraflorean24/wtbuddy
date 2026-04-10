import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getUnreadCount } from '../api/notificationApi'
import { IoNotificationsOutline } from 'react-icons/io5'

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

    useEffect(() => {
        fetchUnreadCount()
    }, [location.pathname])

    const fetchUnreadCount = async () => {
        try {
            const count = await getUnreadCount()
            setUnreadCount(count)
        } catch { /* silently ignore */ }
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const navLink = (to, label) => {
        const active = location.pathname === to
        return (
            <Link className={`nav-link ${active ? 'nav-link-active' : ''}`} to={to}>
                {label}
            </Link>
        )
    }

    return (
        <nav className="flex items-center px-4 h-14" style={{ backgroundColor: '#3b0764' }}>
            <Link className="font-bold text-white text-lg mr-6 no-underline hover:text-white" to="/">
                WTBuddy
            </Link>

            {/* Left links */}
            <div className="flex items-center gap-1 flex-1">
                {navLink('/events', 'Events')}
                {navLink('/trips', 'Trips')}
                {navLink('/feedback', 'Feedback')}
            </div>

            {/* Right: bell + username + logout */}
            <div className="flex items-center gap-4">

                {/* Bell icon */}
                <Link
                    to="/notifications"
                    className="relative text-white no-underline leading-none"
                    style={{ lineHeight: 1 }}>
                    <IoNotificationsOutline size={22} />
                    {unreadCount > 0 && (
                        <span
                            className="absolute font-bold text-center leading-none bg-red-600 text-white rounded-full"
                            style={{ fontSize: '9px', top: '-6px', right: '-8px', minWidth: '16px', padding: '2px 4px' }}>
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </Link>

                {/* Username */}
                <span className="text-gray-200 text-sm flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                        fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10c-2.029 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    </svg>
                    {user?.username}
                </span>

                <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
                    Logout
                </button>
            </div>
        </nav>
    )
}

export default Navbar
