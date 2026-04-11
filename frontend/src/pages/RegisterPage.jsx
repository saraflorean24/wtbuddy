import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/authApi'
import { useAuth } from '../context/AuthContext'

function RegisterPage() {
    const [formData, setFormData] = useState({
        email: '', username: '', fullName: '', password: '', confirmPassword: '',
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const { login: authLogin } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            const data = await register(formData.email, formData.username, formData.password, formData.fullName)
            authLogin({ id: data.id, email: data.email, username: data.username, role: data.role, profileComplete: false }, data.token)
            navigate('/setup-profile')
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed')
        } finally {
            setLoading(false)
        }
    }

    const field = (label, name, type = 'text') => (
        <div className="mb-4">
            <label className="form-label">{label}</label>
            <input
                type={type}
                className="form-control"
                name={name}
                value={formData[name]}
                onChange={handleChange}
                required
            />
        </div>
    )

    return (
        <div className="flex justify-center items-center min-h-screen" style={{ background: 'linear-gradient(135deg, #2d1b69 0%, #4a2494 50%, #6d3fcb 100%)' }}>
            <div className="w-full max-w-md px-4 py-8">
                <div className="card">
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-center mb-1">WTBuddy</h2>
                        <p className="text-center text-gray-500 text-sm mb-6">Create your account</p>

                        {error && (
                            <div className="alert alert-danger">{error}</div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {field('Full Name', 'fullName')}
                            {field('Username', 'username')}
                            {field('Email', 'email', 'email')}
                            {field('Password', 'password', 'password')}
                            {field('Confirm Password', 'confirmPassword', 'password')}

                            <button
                                type="submit"
                                className="btn btn-primary btn-md w-full mt-2"
                                disabled={loading}>
                                {loading ? 'Loading...' : 'Register'}
                            </button>
                        </form>

                        <p className="text-center mt-4 text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="text-violet-600 hover:underline font-medium">Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RegisterPage
