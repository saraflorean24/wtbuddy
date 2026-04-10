import { Link } from 'react-router-dom'

function HomePage() {
    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2d1b69 0%, #4a2494 50%, #6d3fcb 100%)' }}>
            {/* Nav */}
            <nav className="d-flex justify-content-between align-items-center px-4 px-md-5 py-3">
                <Link to="/" className="fw-bold text-white fs-4 text-decoration-none">WTBuddy</Link>
                <div className="d-flex gap-2">
                    <Link to="/login" className="btn btn-outline-light btn-sm px-3">Log In</Link>
                    <Link to="/register" className="btn btn-light btn-sm px-3 fw-semibold text-dark">Sign Up</Link>
                </div>
            </nav>

            {/* Hero */}
            <div className="d-flex flex-column align-items-center justify-content-center text-center px-3"
                style={{ minHeight: 'calc(100vh - 68px)', paddingBottom: '80px' }}>

                <h1 className="display-3 fw-bold text-white mb-3" style={{ letterSpacing: '-1px', maxWidth: '700px' }}>
                    Find your perfect<br />
                    <span style={{ color: '#ddd6fe' }}>travel buddy</span>
                </h1>

                <p className="text-white-50 fs-5 mb-5" style={{ maxWidth: '500px' }}>
                    Plan trips, discover events, and connect with like-minded travelers across the US.
                </p>

                <div className="d-flex gap-3 flex-wrap justify-content-center">
                    <Link to="/register" className="btn btn-primary btn-lg px-5 fw-semibold"
                        style={{ borderRadius: '50px' }}>
                        Get Started
                    </Link>
                    <Link to="/login" className="btn btn-outline-light btn-lg px-5"
                        style={{ borderRadius: '50px' }}>
                        Log In
                    </Link>
                </div>

                {/* Feature pills */}
                <div className="d-flex gap-3 flex-wrap justify-content-center mt-5">
                    {['Plan Trips', 'Browse Events', 'Meet Travelers', 'Get Notifications'].map(f => (
                        <span key={f} className="badge rounded-pill px-3 py-2"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                            {f}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default HomePage
