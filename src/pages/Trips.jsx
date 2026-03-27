import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Trips() {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '' })

  useEffect(() => { loadTrips() }, [])

  async function loadTrips() {
    const { data } = await supabase.from('trips').select('*').order('created_at', { ascending: false })
    setTrips(data || [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    const { data } = await supabase.from('trips').insert({ name: form.name }).select().single()
    if (data) {
      // Auto-generate trip_items for packing + consumable items
      const { data: items } = await supabase.from('items').select('id, category').in('category', ['packing', 'consumable'])
      if (items?.length) {
        const tripItems = items.map(item => ({
          trip_id: data.id,
          item_id: item.id,
          status: 'pending',
        }))
        await supabase.from('trip_items').insert(tripItems)
      }

      // Auto-generate checklist items
      const { data: templates } = await supabase.from('checklist_templates').select('id')
      if (templates?.length) {
        const checklistItems = templates.map(t => ({
          trip_id: data.id,
          template_id: t.id,
          completed: false,
        }))
        await supabase.from('trip_checklist').insert(checklistItems)
      }
    }
    setShowModal(false)
    setForm({ name: '' })
    loadTrips()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this trip and all its data?')) return
    await supabase.from('trips').delete().eq('id', id)
    loadTrips()
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Trips</h1>
          <p className="page-subtitle">{trips.length} trip{trips.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Trip
          </button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <p>No trips yet. Create a trip to start tracking your packing and checklists.</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create First Trip</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {trips.map(trip => (
            <Link key={trip.id} to={`/trips/${trip.id}`} className="card" style={{ textDecoration: 'none', display: 'block' }}>
              <div className="list-item" style={{ borderBottom: 'none' }}>
                <div className="list-item-content">
                  <div className="list-item-title">{trip.name}</div>
                  <div className="list-item-subtitle">{formatDate(trip.created_at)}</div>
                </div>
                <span className={`trip-status trip-status-${trip.status}`}>{trip.status}</span>
                <button
                  className="btn btn-ghost btn-icon"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(trip.id) }}
                  title="Delete"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Trip</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Trip Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Lake Trip - July 2026"
                    required
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                  This will create packing checklists for all your packing and consumable items,
                  plus departure and setup checklists.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Trip</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
