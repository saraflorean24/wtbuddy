import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getProfile, updateProfile, getAllInterests, getMyInterests, getUserInterests, addInterest, removeInterest } from '../api/userApi'
import { UserIcon } from '@heroicons/react/24/solid'
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

const JOB_TYPE_LABELS = Object.fromEntries(JOB_TYPES.map(j => [j.value, j.label]))

const CATEGORY_LABELS = {
    OUTDOOR: 'Outdoor', SPORTS: 'Sports', FOOD_DRINK: 'Food & Drink',
    ARTS: 'Arts', MUSIC: 'Music', TRAVEL: 'Travel',
    GAMING: 'Gaming', SOCIAL: 'Social', FITNESS: 'Fitness', OTHER: 'Other',
}

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

function InfoRow({ label, value }) {
    if (!value) return null
    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide sm:w-36 flex-shrink-0">{label}</span>
            <span className="text-sm text-gray-800">{value}</span>
        </div>
    )
}

function ProfilePage() {
    const { id } = useParams()
    const { user: authUser } = useAuth()
    const isOwn = String(authUser?.id) === String(id)

    const [profile,      setProfile]      = useState(null)
    const [interests,    setInterests]    = useState([])   // user's current interests
    const [allInterests, setAllInterests] = useState([])   // full catalogue
    const [loading,      setLoading]      = useState(true)
    const [error,        setError]        = useState('')

    // Edit mode
    const [editing,    setEditing]    = useState(false)
    const [saving,     setSaving]     = useState(false)
    const [saveError,  setSaveError]  = useState('')
    const [form,       setForm]       = useState({})
    const [selectedIds, setSelectedIds] = useState(new Set())

    // Cities for selected state
    const [cities,        setCities]        = useState([])
    const [citiesLoading, setCitiesLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        try {
            const [p, i, all] = await Promise.all([
                getProfile(id),
                isOwn ? getMyInterests() : getUserInterests(id),
                isOwn ? getAllInterests() : Promise.resolve([]),
            ])
            setProfile(p)
            setInterests(i)
            setAllInterests(all)
        } catch {
            setError('Failed to load profile')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { load() }, [id])

    // Fetch cities when state changes in edit form
    useEffect(() => {
        if (!editing || !form.jobState) { setCities([]); return }
        setCitiesLoading(true)
        fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ country: 'United States', state: form.jobState }),
        })
            .then(r => r.json())
            .then(data => setCities(data.data ?? []))
            .catch(() => setCities([]))
            .finally(() => setCitiesLoading(false))
    }, [form.jobState, editing])

    const startEdit = () => {
        setForm({
            fullName:      profile.fullName     ?? '',
            bio:           profile.bio          ?? '',
            jobType:       profile.jobType      ?? '',
            jobCity:       profile.jobCity      ?? '',
            jobState:      profile.jobState     ?? '',
            programStart:  profile.programStart ?? '',
            programEnd:    profile.programEnd   ?? '',
            profilePhotoUrl: profile.profilePhotoUrl ?? '',
        })
        setSelectedIds(new Set(interests.map(i => i.id)))
        setSaveError('')
        setEditing(true)
    }

    const cancelEdit = () => { setEditing(false); setSaveError('') }

    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

    const toggleInterest = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleSave = async () => {
        setSaving(true)
        setSaveError('')
        try {
            await updateProfile(id, {
                fullName:       form.fullName       || null,
                bio:            form.bio            || null,
                jobType:        form.jobType        || null,
                jobCity:        form.jobCity        || null,
                jobState:       form.jobState       || null,
                programStart:   form.programStart   || null,
                programEnd:     form.programEnd     || null,
                profilePhotoUrl: form.profilePhotoUrl || null,
            })

            // Sync interests: add new, remove removed
            const oldIds  = new Set(interests.map(i => i.id))
            const toAdd   = [...selectedIds].filter(id => !oldIds.has(id))
            const toRemove = [...oldIds].filter(id => !selectedIds.has(id))
            await Promise.all([
                ...toAdd.map(id => addInterest(id)),
                ...toRemove.map(id => removeInterest(id)),
            ])

            await load()
            setEditing(false)
        } catch (err) {
            setSaveError(err.response?.data?.message || 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>
    if (error)   return <div className="text-center py-16 text-red-500">{error}</div>
    if (!profile) return <div className="text-center py-16 text-gray-400">Profile not found.</div>

    const byCategory = (editing ? allInterests : interests).reduce((acc, i) => {
        const cat = i.category || 'OTHER'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(i)
        return acc
    }, {})

    const programDates = profile.programStart && profile.programEnd
        ? `${new Date(profile.programStart).toLocaleDateString()} → ${new Date(profile.programEnd).toLocaleDateString()}`
        : profile.programStart ? `From ${new Date(profile.programStart).toLocaleDateString()}` : null
    const location = [profile.jobCity, profile.jobState].filter(Boolean).join(', ')

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">

            {/* Header card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                <div className="h-24 w-full" style={{ background: 'linear-gradient(135deg, #3b0764, #6d3fcb)' }} />
                <div className="px-6 pb-6">
                    <div className="flex items-end justify-between -mt-10 mb-6">
                        <div className="flex items-end gap-4">
                            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-violet-100 flex items-center justify-center flex-shrink-0">
                                {(editing ? form.profilePhotoUrl : profile.profilePhotoUrl)
                                    ? <img src={editing ? form.profilePhotoUrl : profile.profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                                    : <UserIcon className="w-10 h-10 text-violet-600" />
                                }
                            </div>
                            <div className="translate-y-5">
                                {editing
                                    ? <input type="text" className="form-control font-bold text-lg" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Full name" />
                                    : <h1 className="text-xl font-bold text-gray-900 leading-tight">{profile.fullName || profile.username}</h1>
                                }
                                <p className="text-sm text-gray-500 mt-0.5">@{profile.username}</p>
                            </div>
                        </div>

                        {isOwn && !editing && (
                            <button className="btn btn-outline-primary btn-sm translate-y-5" onClick={startEdit}>
                                Edit profile
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <div>
                            <label className="form-label">Bio</label>
                            <textarea
                                className="form-control"
                                rows={4}
                                value={form.bio}
                                onChange={e => set('bio', e.target.value)}
                                placeholder="Tell others about yourself…"
                            />
                        </div>
                    ) : (
                        profile.bio && <p className="text-sm text-gray-600 leading-relaxed">{profile.bio}</p>
                    )}

                    {editing && (
                        <div className="mt-4">
                            <label className="form-label">Profile photo URL</label>
                            <input type="text" className="form-control" value={form.profilePhotoUrl} onChange={e => set('profilePhotoUrl', e.target.value)} placeholder="https://…" />
                        </div>
                    )}
                </div>
            </div>

            {/* Work info card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mb-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Work & Travel</h2>

                {editing ? (
                    <div className="space-y-3">
                        <div>
                            <label className="form-label">Job type</label>
                            <select className="form-select" value={form.jobType} onChange={e => set('jobType', e.target.value)}>
                                <option value="">Select…</option>
                                {JOB_TYPES.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="form-label">State</label>
                            <Autocomplete
                                value={form.jobState}
                                options={US_STATES}
                                placeholder="e.g. Florida"
                                openZIndex={30}
                                onChange={val => { set('jobState', val); set('jobCity', '') }}
                            />
                        </div>
                        <div>
                            <label className="form-label">City</label>
                            <Autocomplete
                                value={form.jobCity}
                                options={cities}
                                loading={citiesLoading}
                                placeholder={form.jobState ? 'e.g. Orlando' : 'Select a state first'}
                                disabled={!form.jobState}
                                openZIndex={20}
                                onChange={val => set('jobCity', val)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="form-label">Program start</label>
                                <input type="date" className="form-control" value={form.programStart} onChange={e => set('programStart', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Program end</label>
                                <input type="date" className="form-control" value={form.programEnd} onChange={e => set('programEnd', e.target.value)} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <InfoRow label="Job type"      value={JOB_TYPE_LABELS[profile.jobType] ?? profile.jobType} />
                        <InfoRow label="Location"      value={location} />
                        <InfoRow label="Program dates" value={programDates} />
                    </>
                )}
            </div>

            {/* Interests card */}
            {(editing || interests.length > 0) && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 mb-4">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Interests</h2>

                    {editing ? (
                        <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
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
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(byCategory).map(([cat, items]) => (
                                <div key={cat}>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{CATEGORY_LABELS[cat] ?? cat}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {items.map(i => (
                                            <span key={i.id} className="px-3 py-1.5 rounded-full text-sm font-medium bg-violet-50 text-violet-700 border border-violet-100">
                                                {i.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Edit action bar */}
            {editing && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
                    {saveError && <p className="text-sm text-red-600 flex-1">{saveError}</p>}
                    <div className="flex gap-3 ml-auto">
                        <button className="btn btn-secondary btn-md" onClick={cancelEdit} disabled={saving}>Cancel</button>
                        <button className="btn btn-primary btn-md" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfilePage
