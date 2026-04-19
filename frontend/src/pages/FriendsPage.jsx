import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getFriends, deleteFriendship } from '../api/friendshipApi'
import { UserIcon } from '@heroicons/react/24/outline'

function ConfirmModal({ name, onConfirm, onCancel }) {
    return (
        <div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 100, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={onCancel}>
            <div
                className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4"
                onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-semibold text-gray-900 mb-2">Remove friend?</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to remove <span className="font-medium text-gray-800">{name}</span> from your friends?
                </p>
                <div className="flex gap-3 justify-end">
                    <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-sm bg-red-600 text-white hover:bg-red-700 border-0" onClick={onConfirm}>Remove</button>
                </div>
            </div>
        </div>
    )
}

function FriendCard({ friendship, currentUserId, onRemove }) {
    const isFriendTheAddressee = friendship.requesterId === currentUserId
    const friendId       = isFriendTheAddressee ? friendship.addresseeId       : friendship.requesterId
    const friendUsername = isFriendTheAddressee ? friendship.addresseeUsername : friendship.requesterUsername

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
                <Link
                    to={`/profile/${friendId}`}
                    className="font-semibold text-sm text-gray-900 hover:text-violet-700 no-underline block truncate">
                    @{friendUsername}
                </Link>
                <p className="text-xs text-gray-400 mt-0.5">
                    Friends since {new Date(friendship.updatedAt).toLocaleDateString()}
                </p>
            </div>
            <button
                className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50 flex-shrink-0"
                onClick={() => onRemove(friendship.id, friendUsername)}>
                Remove
            </button>
        </div>
    )
}

function FriendsPage() {
    const { user } = useAuth()
    const [friends,  setFriends]  = useState([])
    const [loading,  setLoading]  = useState(true)
    const [error,    setError]    = useState('')
    const [confirm,  setConfirm]  = useState(null) // { id, name }
    const [removing, setRemoving] = useState(false)

    useEffect(() => {
        getFriends()
            .then(setFriends)
            .catch(() => setError('Failed to load friends'))
            .finally(() => setLoading(false))
    }, [])

    const askRemove = (id, name) => setConfirm({ id, name })
    const cancelRemove = () => setConfirm(null)

    const confirmRemove = async () => {
        if (!confirm) return
        setRemoving(true)
        try {
            await deleteFriendship(confirm.id)
            setFriends(prev => prev.filter(f => f.id !== confirm.id))
            setConfirm(null)
        } catch {
            setError('Failed to remove friend')
            setConfirm(null)
        } finally {
            setRemoving(false)
        }
    }

    if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Friends</h1>

            {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

            {friends.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <p className="text-base mb-2">No friends yet.</p>
                    <p className="text-sm">Head to the <Link to="/home" className="text-violet-600 hover:underline">home page</Link> to find people to connect with.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {friends.map(f => (
                        <FriendCard
                            key={f.id}
                            friendship={f}
                            currentUserId={user?.id}
                            onRemove={askRemove}
                        />
                    ))}
                </div>
            )}

            {confirm && (
                <ConfirmModal
                    name={confirm.name}
                    onConfirm={confirmRemove}
                    onCancel={cancelRemove}
                />
            )}
        </div>
    )
}

export default FriendsPage
