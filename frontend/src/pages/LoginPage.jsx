import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login: authLogin } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            const data = await login(email, password)
            authLogin({ id: data.id, email: data.email, username: data.username, role: data.role, profileComplete: data.profileComplete }, data.token)
            navigate(data.profileComplete ? '/events' : '/setup-profile')
        } catch {
            setError('Invalid email or password')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex justify-center items-center min-h-screen" style={{ background: 'linear-gradient(135deg, #2d1b69 0%, #4a2494 50%, #6d3fcb 100%)' }}>
            <div className="w-full max-w-sm px-4">
                <div className="card">
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-center mb-1">WTBuddy</h2>
                        <p className="text-center text-gray-500 text-sm mb-6">Log in to your account</p>

                        {error && (
                            <div className="alert alert-danger">{error}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary btn-md w-full"
                                disabled={loading}>
                                {loading ? 'Loading...' : 'Log in'}
                            </button>
                        </form>

                        <p className="text-center mt-4 text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-violet-600 hover:underline font-medium">Register</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
