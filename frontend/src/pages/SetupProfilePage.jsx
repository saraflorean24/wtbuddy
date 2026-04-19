import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { updateProfile, getAllInterests, addInterest } from '../api/userApi'
import Autocomplete from '../components/Autocomplete'

const JOB_TYPES = [
    { value: 'HOTEL',          label: 'Hotel' },
    { value: 'RESORT',         label: 'Resort' },
    { value: 'AMUSEMENT_PARK', label: 'Amusement Park' },
    { value: 'RESTAURANT',     label: 'Restaurant' },
    { value: 'CAFE',           label: 'Cafe' },
    { value: 'RETAIL',         label: 'Retail' },
    { value: 'CAMP',           label: 'Camp' },
    { value: 'BEACH_CLUB',     label: 'Beach Club' },
    { value: 'GOLF_COURSE',    label: 'Golf Course' },
    { value: 'WAREHOUSE',      label: 'Warehouse' },
    { value: 'OTHER',          label: 'Other' },
]

const US_STATES = [
    'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
    'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
    'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
    'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
    'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
    'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
    'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
    'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
]

const CATEGORY_LABELS = {
    OUTDOOR: 'Outdoor', SPORTS: 'Sports', FOOD_DRINK: 'Food & Drink',
    ARTS: 'Arts', MUSIC: 'Music', TRAVEL: 'Travel',
    GAMING: 'Gaming', SOCIAL: 'Social', FITNESS: 'Fitness', OTHER: 'Other',
}

const STEPS = ['Your Work', 'About You', 'Interests']

// ── Main page ─────────────────────────────────────────────────────────────────
function SetupProfilePage() {
    const { user, completeProfile } = useAuth()
    const navigate = useNavigate()

    const [step, setStep]       = useState(0)
    const [error, setError]     = useState('')
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        jobType: '', jobCity: '', jobState: '', programStart: '', programEnd: '', bio: '',
    })

    // Cities for the selected state
    const [cities, setCities]           = useState([])
    const [citiesLoading, setCitiesLoading] = useState(false)

    const [allInterests, setAllInterests]         = useState([])
    const [selectedIds, setSelectedIds]           = useState(new Set())
    const [interestsLoading, setInterestsLoading] = useState(false)

    useEffect(() => {
        setInterestsLoading(true)
        getAllInterests()
            .then(data => setAllInterests(data))
            .catch((err) => {
                console.error('Failed to load interests:', err)
                setError('Could not load interests. Make sure the backend is running.')
            })
            .finally(() => setInterestsLoading(false))
    }, [])

    // Fetch cities when state changes
    useEffect(() => {
        if (!formData.jobState) { setCities([]); return }
        setCitiesLoading(true)
        setCities([])
        fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: 'United States', state: formData.jobState }),
        })
            .then(r => r.json())
            .then(data => setCities(data.data ?? []))
            .catch(() => setCities([]))
            .finally(() => setCitiesLoading(false))
    }, [formData.jobState])

    const set = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

    const toggleInterest = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const canAdvance = () => {
        if (step === 0) return formData.jobType && formData.jobCity && formData.jobState && formData.programStart && formData.programEnd
        return true
    }

    const handleFinish = async () => {
        setError('')
        setLoading(true)
        try {
            await updateProfile(user.id, {
                jobType:      formData.jobType,
                jobCity:      formData.jobCity,
                jobState:     formData.jobState,
                programStart: formData.programStart,
                programEnd:   formData.programEnd,
                bio:          formData.bio || null,
            })
            await Promise.allSettled([...selectedIds].map(id => addInterest(id)))
            completeProfile()
            navigate('/events')
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save profile. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const byCategory = allInterests.reduce((acc, i) => {
        const cat = i.category || 'OTHER'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(i)
        return acc
    }, {})

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #2d1b69 0%, #4a2494 50%, #6d3fcb 100%)' }}>
            {/* Header */}
            <div className="text-center pt-10 pb-6 px-4">
                <h1 className="text-3xl font-bold text-white mb-1">WTBuddy</h1>
                <p className="text-violet-200 text-sm">Let's set up your profile so others can find you</p>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6 px-4">
                {STEPS.map((label, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                            i < step   ? 'bg-green-400 text-white' :
                            i === step ? 'bg-white text-violet-700' :
                                         'bg-white/20 text-white/60'
                        }`}>
                            {i < step ? '✓' : i + 1}
                        </div>
                        <span className={`text-xs hidden sm:block ${i === step ? 'text-white font-semibold' : 'text-white/60'}`}>{label}</span>
                        {i < STEPS.length - 1 && <div className="w-6 h-px bg-white/30 mx-1" />}
                    </div>
                ))}
            </div>

            {/* Card */}
            <div className="flex justify-center px-4 pb-10">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl">
                    <div className="p-8">

                        {error && <div className="alert alert-danger mb-4">{error}</div>}

                        {/* ── Step 0: Work info ── */}
                        {step === 0 && (
                            <div>
                                <h2 className="text-xl font-bold mb-1">Your Work & Travel job</h2>
                                <p className="text-gray-500 text-sm mb-6">Tell others where you're working and when your program runs.</p>

                                <div className="mb-4">
                                    <label className="form-label">Job type *</label>
                                    <select
                                        className="form-select"
                                        value={formData.jobType}
                                        onChange={e => set('jobType', e.target.value)}>
                                        <option value="">Select a job type…</option>
                                        {JOB_TYPES.map(j => (
                                            <option key={j.value} value={j.value}>{j.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="mb-4">
                                    <label className="form-label">State *</label>
                                    <Autocomplete
                                        value={formData.jobState}
                                        options={US_STATES}
                                        placeholder="e.g. Florida"
                                        openZIndex={30}
                                        onChange={val => {
                                            set('jobState', val)
                                            set('jobCity', '')
                                        }}
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="form-label">City *</label>
                                    <Autocomplete
                                        value={formData.jobCity}
                                        options={cities}
                                        loading={citiesLoading}
                                        placeholder={formData.jobState ? 'e.g. Orlando' : 'Select a state first'}
                                        disabled={!formData.jobState}
                                        onChange={val => set('jobCity', val)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="form-label">Program start *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.programStart}
                                            onChange={e => set('programStart', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="form-label">Program end *</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={formData.programEnd}
                                            onChange={e => set('programEnd', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Step 1: Bio ── */}
                        {step === 1 && (
                            <div>
                                <h2 className="text-xl font-bold mb-1">About you</h2>
                                <p className="text-gray-500 text-sm mb-6">A short bio helps other participants get to know you.</p>
                                <div>
                                    <label className="form-label">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
                                    <textarea
                                        className="form-control"
                                        rows={5}
                                        placeholder="Tell others a bit about yourself — where you're from, what you enjoy, what you're hoping to experience on your W&T program…"
                                        value={formData.bio}
                                        onChange={e => set('bio', e.target.value)}
                                    />
                                    <p className="text-xs text-gray-400 mt-1 text-right">{formData.bio.length} chars</p>
                                </div>
                            </div>
                        )}

                        {/* ── Step 2: Interests ── */}
                        {step === 2 && (
                            <div>
                                <h2 className="text-xl font-bold mb-1">Your interests</h2>
                                <p className="text-gray-500 text-sm mb-4">Pick what you enjoy — helps find compatible travel buddies. <span className="text-gray-400">(optional)</span></p>

                                {interestsLoading ? (
                                    <p className="text-gray-400 text-sm text-center py-6">Loading interests…</p>
                                ) : allInterests.length === 0 ? (
                                    <p className="text-gray-400 text-sm text-center py-6">No interests available yet.</p>
                                ) : (
                                    <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                                        {Object.entries(byCategory).map(([cat, items]) => (
                                            <div key={cat}>
                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{CATEGORY_LABELS[cat] ?? cat}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {items.map(interest => (
                                                        <button
                                                            key={interest.id}
                                                            type="button"
                                                            onClick={() => toggleInterest(interest.id)}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                                                selectedIds.has(interest.id)
                                                                    ? 'bg-violet-600 border-violet-600 text-white'
                                                                    : 'bg-white border-gray-300 text-gray-700 hover:border-violet-400'
                                                            }`}>
                                                            {interest.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedIds.size > 0 && (
                                    <p className="text-xs text-violet-600 mt-3 font-medium">{selectedIds.size} interest{selectedIds.size !== 1 ? 's' : ''} selected</p>
                                )}
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex justify-between mt-8">
                            {step > 0 ? (
                                <button type="button" className="btn btn-outline-primary btn-md" onClick={() => setStep(s => s - 1)}>
                                    Back
                                </button>
                            ) : <div />}

                            {step < STEPS.length - 1 ? (
                                <button type="button" className="btn btn-primary btn-md" disabled={!canAdvance()} onClick={() => setStep(s => s + 1)}>
                                    Continue
                                </button>
                            ) : (
                                <button type="button" className="btn btn-primary btn-md" disabled={loading} onClick={handleFinish}>
                                    {loading ? 'Saving…' : 'Finish setup'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SetupProfilePage
