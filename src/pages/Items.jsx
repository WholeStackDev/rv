import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Items() {
  const [items, setItems] = useState([])
  const [containers, setContainers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ name: '', category: 'packing', container_id: '', quantity: 1, notes: '' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [itemsRes, containersRes] = await Promise.all([
      supabase.from('items').select('*, container:containers(id, name, sub_location)').order('name'),
      supabase.from('containers').select('id, name, sub_location').order('name'),
    ])
    setItems(itemsRes.data || [])
    setContainers(containersRes.data || [])
    setLoading(false)
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const unassigned = items.filter(i => !i.container_id)

  function openCreate() {
    setEditing(null)
    setForm({ name: '', category: 'packing', container_id: '', quantity: 1, notes: '' })
    setShowModal(true)
  }

  function openEdit(item) {
    setEditing(item)
    setForm({
      name: item.name || '',
      category: item.category || 'packing',
      container_id: item.container_id || '',
      quantity: item.quantity || 1,
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      name: form.name,
      category: form.category,
      container_id: form.container_id || null,
      quantity: Number(form.quantity) || 1,
      notes: form.notes || null,
    }

    if (editing) {
      await supabase.from('items').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('items').insert(payload)
    }
    setShowModal(false)
    loadData()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this item?')) return
    await supabase.from('items').delete().eq('id', id)
    loadData()
  }

  function containerLabel(c) {
    if (!c) return ''
    return c.sub_location ? `${c.name} - ${c.sub_location}` : c.name
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Items</h1>
          <p className="page-subtitle">
            {items.length} item{items.length !== 1 ? 's' : ''}
            {unassigned.length > 0 && ` \u00b7 ${unassigned.length} unassigned`}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Item
          </button>
        </div>
      </div>

      <div className="filter-bar">
        {['all', 'permanent', 'consumable', 'packing'].map(f => (
          <button
            key={f}
            className={`filter-chip ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && ` (${items.filter(i => i.category === f).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            <p>No items yet. Add items to track what's in your RV.</p>
            <button className="btn btn-primary" onClick={openCreate}>Add Item</button>
          </div>
        </div>
      ) : (
        <div className="card">
          {filtered.map(item => (
            <div key={item.id} className="list-item" onClick={() => openEdit(item)} style={{ cursor: 'pointer' }}>
              <div className="list-item-content">
                <div className="list-item-title">
                  {item.name}
                  {item.quantity > 1 && <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> x{item.quantity}</span>}
                </div>
                <div className="list-item-subtitle">
                  {item.container ? containerLabel(item.container) : 'Unassigned'}
                </div>
              </div>
              <span className={`badge badge-${item.category}`}>{item.category}</span>
              <div className="list-item-actions">
                <button className="btn btn-ghost btn-icon" onClick={(e) => { e.stopPropagation(); handleDelete(item.id) }} title="Delete">
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
              <h2 className="modal-title">{editing ? 'Edit Item' : 'New Item'}</h2>
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
                    placeholder="e.g. First aid kit"
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    <option value="permanent">Permanent - stays in RV</option>
                    <option value="consumable">Consumable - verify supply</option>
                    <option value="packing">Packing - load before trip</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Container</label>
                  <select
                    className="form-select"
                    value={form.container_id}
                    onChange={e => setForm({ ...form, container_id: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {containers.map(c => (
                      <option key={c.id} value={c.id}>{containerLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    className="form-input"
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={e => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-textarea"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Save Changes' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
