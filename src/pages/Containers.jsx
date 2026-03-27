import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Containers() {
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', sub_location: '', width_inches: '', height_inches: '', depth_inches: '', notes: '' })

  useEffect(() => { loadContainers() }, [])

  async function loadContainers() {
    const { data } = await supabase
      .from('containers')
      .select('*, items:items(count)')
      .order('sort_order')
      .order('name')
    setContainers(data || [])
    setLoading(false)
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', sub_location: '', width_inches: '', height_inches: '', depth_inches: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(container) {
    setEditing(container)
    setForm({
      name: container.name || '',
      sub_location: container.sub_location || '',
      width_inches: container.width_inches || '',
      height_inches: container.height_inches || '',
      depth_inches: container.depth_inches || '',
      notes: container.notes || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      name: form.name,
      sub_location: form.sub_location || null,
      width_inches: form.width_inches ? Number(form.width_inches) : null,
      height_inches: form.height_inches ? Number(form.height_inches) : null,
      depth_inches: form.depth_inches ? Number(form.depth_inches) : null,
      notes: form.notes || null,
    }

    if (editing) {
      await supabase.from('containers').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('containers').insert(payload)
    }
    setShowModal(false)
    loadContainers()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this container? Items inside will be unassigned.')) return
    await supabase.from('containers').delete().eq('id', id)
    loadContainers()
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Storage Containers</h1>
          <p className="page-subtitle">{containers.length} container{containers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Container
          </button>
        </div>
      </div>

      {containers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <p>No containers yet. Add your first storage container to get started.</p>
            <button className="btn btn-primary" onClick={openCreate}>Add Container</button>
          </div>
        </div>
      ) : (
        <div className="card">
          {containers.map(c => (
            <div key={c.id} className="list-item" onClick={() => openEdit(c)} style={{ cursor: 'pointer' }}>
              <div className="list-item-content">
                <div className="list-item-title">{c.name}</div>
                <div className="list-item-subtitle">
                  {c.sub_location && <span>{c.sub_location}</span>}
                  {c.sub_location && (c.width_inches || c.height_inches || c.depth_inches) && <span> &middot; </span>}
                  {(c.width_inches || c.height_inches || c.depth_inches) && (
                    <span className="dimensions">
                      {[c.width_inches, c.height_inches, c.depth_inches].filter(Boolean).join('" x ')}"
                    </span>
                  )}
                  <span> &middot; {c.items?.[0]?.count || 0} item{(c.items?.[0]?.count || 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="list-item-actions">
                <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(c.id) }} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Container' : 'New Container'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Drawers beside fireplace"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Sub-location</label>
                  <input
                    className="form-input"
                    value={form.sub_location}
                    onChange={e => setForm({ ...form, sub_location: e.target.value })}
                    placeholder="e.g. Top Middle"
                  />
                  <div className="form-help">Optional subdivision within this container</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Dimensions (inches)</label>
                  <div className="form-row">
                    <div>
                      <input
                        className="form-input"
                        type="number"
                        step="0.25"
                        value={form.width_inches}
                        onChange={e => setForm({ ...form, width_inches: e.target.value })}
                        placeholder="Width"
                      />
                    </div>
                    <div>
                      <input
                        className="form-input"
                        type="number"
                        step="0.25"
                        value={form.height_inches}
                        onChange={e => setForm({ ...form, height_inches: e.target.value })}
                        placeholder="Height"
                      />
                    </div>
                    <div>
                      <input
                        className="form-input"
                        type="number"
                        step="0.25"
                        value={form.depth_inches}
                        onChange={e => setForm({ ...form, depth_inches: e.target.value })}
                        placeholder="Depth"
                      />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes about this container"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Container'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
