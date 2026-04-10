import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getPublicTestimonials } from '../api/feedbackApi'

function Stars({ rating }) {
    return (
        <span className="text-amber-400 text-base">
            {'★'.repeat(rating)}
            <span className="text-white/20">{'★'.repeat(5 - rating)}</span>
        </span>
    )
}

function HomePage() {
    const [testimonials, setTestimonials] = useState([])

    useEffect(() => {
        getPublicTestimonials()
            .then(data => setTestimonials(data.filter(t => t.message)))
            .catch(() => {})
    }, [])

    return (
        <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #2d1b69 0%, #4a2494 50%, #6d3fcb 100%)' }}>
            {/* Nav */}
            <nav className="flex justify-between items-center px-6 md:px-10 py-4">
                <Link to="/" className="font-bold text-white text-xl no-underline">WTBuddy</Link>
                <div className="flex gap-2">
                    <Link to="/login" className="btn btn-outline-light btn-sm px-4">Log In</Link>
                    <Link to="/register" className="btn btn-sm bg-white text-gray-900 font-semibold hover:bg-gray-100 px-4">Sign Up</Link>
                </div>
            </nav>

            {/* Hero */}
            <div className="flex flex-col items-center justify-center text-center px-4 pt-16 pb-20">
                <h1 className="text-5xl md:text-6xl font-bold text-white mb-4" style={{ letterSpacing: '-1px', maxWidth: '700px' }}>
                    Find your perfect<br />
                    <span style={{ color: '#ddd6fe' }}>Work & Travel buddy</span>
                </h1>
                <p className="text-white/50 text-lg mb-10" style={{ maxWidth: '500px' }}>
                    Plan trips, discover events, and connect with like-minded <br /> J1 students across the US.
                </p>
                <div className="flex gap-4 flex-wrap justify-center">
                    <Link to="/register" className="btn btn-primary btn-lg px-10 font-semibold rounded-full">
                        Get Started
                    </Link>
                    <Link to="/login" className="btn btn-outline-light btn-lg px-10 rounded-full">
                        Log In
                    </Link>
                </div>

                {/* Feature pills */}
                <div className="flex gap-3 flex-wrap justify-center mt-10">
                    {['Plan Trips', 'Browse Events', 'Meet Travelers', 'Get Notifications'].map(f => (
                        <span key={f} className="px-4 py-2 rounded-full text-sm"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)' }}>
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* Testimonials */}
            {testimonials.length > 0 && (
                <div className="px-6 md:px-12 pb-20">
                    <h2 className="text-center text-white/80 text-xl font-semibold mb-8">
                        What our Work & Travelers say
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                        {testimonials.map(t => (
                            <div key={t.id}
                                className="rounded-2xl p-5 flex flex-col gap-3"
                                style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)' }}>
                                <Stars rating={t.rating} />
                                <p className="text-white/85 text-sm leading-relaxed flex-1">
                                    "{t.message}"
                                </p>
                                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                                    <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {t.username?.[0]?.toUpperCase()}
                                    </div>
                                    <span className="text-white/70 text-sm font-medium">{t.username}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default HomePage
