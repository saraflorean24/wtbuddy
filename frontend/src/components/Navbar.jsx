import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getUnreadCount } from '../api/notificationApi'
import { IoNotificationsOutline } from 'react-icons/io5'
import { UserIcon, ArrowLeftStartOnRectangleIcon, UserGroupIcon } from '@heroicons/react/24/outline'

function UserMenu({ username, onLogout, userId, isAdmin }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const hideTimer = useRef(null)

    const show = () => { clearTimeout(hideTimer.current); setOpen(true) }
    const hide = () => { hideTimer.current = setTimeout(() => setOpen(false), 150) }

    useEffect(() => () => clearTimeout(hideTimer.current), [])

    return (
        <div ref={ref} className="relative" onMouseEnter={show} onMouseLeave={hide}>
    <span className="text-gray-200 text-sm flex items-center gap-1 cursor-pointer select-none">
        <UserIcon className="w-4 h-4"/>
        {username}
    </span>

            {open && (
                <div
                    className="absolute right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[160px]"
                    style={{zIndex: 50, top: '100%'}}
                    onMouseEnter={show}
                    onMouseLeave={hide}>
                    <Link
                        to={`/profile/${userId}`}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 no-underline whitespace-nowrap">
                        <UserIcon className="w-4 h-4"/>
                        View your profile
                    </Link>
                    {!isAdmin && (
                        <Link
                            to="/friends"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-violet-50 hover:text-violet-700 no-underline whitespace-nowrap">
                            <UserGroupIcon className="w-4 h-4"/>
                            My Friends
                        </Link>
                    )}
                    <div className="border-t border-gray-100 my-1"/>
                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left">
                        <ArrowLeftStartOnRectangleIcon className="w-4 h-4"/>
                        Logout
                    </button>
                </div>
            )}
        </div>
    )
}

function Navbar() {
    const {logout, user} = useAuth()
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
        } catch { /* silently ignore */
        }
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
        <nav className="flex items-center px-4 h-14" style={{backgroundColor: '#3b0764'}}>
            <Link className="font-bold text-white text-lg mr-6 no-underline hover:text-white" to="/">
                WTBuddy
            </Link>

            {/* Left links */}
            <div className="flex items-center gap-1 flex-1">
                {navLink('/home', 'Home')}
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

                <UserMenu username={user?.username} userId={user?.id} onLogout={handleLogout} isAdmin={user?.role === 'ADMIN'} />
            </div>
        </nav>
    )
}

export default Navbar
