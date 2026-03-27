import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TripDetail() {
  const { id } = useParams()
  const [trip, setTrip] = useState(null)
  const [tripItems, setTripItems] = useState([])
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState('packing')

  useEffect(() => { loadTrip() }, [id])

  async function loadTrip() {
    const [tripRes, itemsRes, checklistRes] = await Promise.all([
      supabase.from('trips').select('*').eq('id', id).single(),
      supabase.from('trip_items').select('*, item:items(*, container:containers(name, sub_location))').eq('trip_id', id),
      supabase.from('trip_checklist').select('*, template:checklist_templates(*)').eq('trip_id', id),
    ])
    setTrip(tripRes.data)
    setTripItems(itemsRes.data || [])
    setChecklist(checklistRes.data || [])
    setLoading(false)
  }

  async function updateTripStatus(status) {
    await supabase.from('trips').update({ status }).eq('id', id)
    setTrip({ ...trip, status })
  }

  async function toggleItemStatus(tripItem) {
    const nextStatus = tripItem.status === 'pending'
      ? (tripItem.item.category === 'consumable' ? 'verified' : 'loaded')
      : 'pending'
    await supabase.from('trip_items').update({
      status: nextStatus,
      checked_at: nextStatus !== 'pending' ? new Date().toISOString() : null,
    }).eq('id', tripItem.id)
    setTripItems(prev => prev.map(ti => ti.id === tripItem.id ? { ...ti, status: nextStatus, checked_at: nextStatus !== 'pending' ? new Date().toISOString() : null } : ti))
  }

  async function skipItem(tripItem) {
    const nextStatus = tripItem.status === 'skipped' ? 'pending' : 'skipped'
    await supabase.from('trip_items').update({
      status: nextStatus,
      checked_at: nextStatus !== 'pending' ? new Date().toISOString() : null,
    }).eq('id', tripItem.id)
    setTripItems(prev => prev.map(ti => ti.id === tripItem.id ? { ...ti, status: nextStatus } : ti))
  }

  async function toggleChecklist(item) {
    const completed = !item.completed
    await supabase.from('trip_checklist').update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', item.id)
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed, completed_at: completed ? new Date().toISOString() : null } : c))
  }

  async function resetChecklist(type) {
    const ids = checklist.filter(c => c.template?.type === type).map(c => c.id)
    if (!ids.length) return
    await supabase.from('trip_checklist').update({ completed: false, completed_at: null }).in('id', ids)
    setChecklist(prev => prev.map(c => ids.includes(c.id) ? { ...c, completed: false, completed_at: null } : c))
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!trip) return <div className="empty-state"><p>Trip not found.</p><Link to="/trips" className="btn btn-primary">Back to Trips</Link></div>

  const packingItems = tripItems.filter(ti => ti.item?.category === 'packing')
  const consumableItems = tripItems.filter(ti => ti.item?.category === 'consumable')
  const departureChecklist = checklist.filter(c => c.template?.type === 'departure').sort((a, b) => a.template.sort_order - b.template.sort_order)
  const setupChecklist = checklist.filter(c => c.template?.type === 'setup').sort((a, b) => a.template.sort_order - b.template.sort_order)

  function getProgress(items, field = 'status') {
    if (!items.length) return { done: 0, total: 0, pct: 0 }
    const done = items.filter(i => field === 'status' ? i.status !== 'pending' : i.completed).length
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) }
  }

  const phases = [
    { key: 'packing', label: 'Packing' },
    { key: 'consumables', label: 'Consumables' },
    { key: 'departure', label: 'Departure' },
    { key: 'setup', label: 'Setup' },
  ]

  function containerLabel(c) {
    if (!c) return 'Unassigned'
    return c.sub_location ? `${c.name} - ${c.sub_location}` : c.name
  }

  function renderProgress(items, field = 'status') {
    const p = getProgress(items, field)
    return (
      <div className="checklist-progress">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${p.pct}%` }} />
        </div>
        <span className="progress-text">{p.done}/{p.total}</span>
      </div>
    )
  }

  function groupBySection(items) {
    const groups = {}
    items.forEach(item => {
      const section = item.template?.section || 'Other'
      if (!groups[section]) groups[section] = []
      groups[section].push(item)
    })
    return groups
  }

  return (
    <div>
      <Link to="/trips" className="back-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Trips
      </Link>

      <div className="trip-header">
        <div>
          <h1 className="page-title">{trip.name}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <span className={`trip-status trip-status-${trip.status}`}>{trip.status}</span>
            <select
              className="form-select"
              value={trip.status}
              onChange={e => updateTripStatus(e.target.value)}
              style={{ width: 'auto', fontSize: 13, padding: '4px 8px' }}
            >
              <option value="planning">Planning</option>
              <option value="packing">Packing</option>
              <option value="departing">Departing</option>
              <option value="active">Active</option>
              <option value="setup">Setup</option>
              <option value="returning">Returning</option>
            </select>
          </div>
        </div>
      </div>

      <div className="trip-phase-nav">
        {phases.map(p => (
          <button
            key={p.key}
            className={`phase-btn ${phase === p.key ? 'active' : ''}`}
            onClick={() => setPhase(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {phase === 'packing' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Packing List</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{packingItems.length} items</span>
          </div>
          {renderProgress(packingItems)}
          {packingItems.length === 0 ? (
            <div className="empty-state"><p>No packing items. Add items with category "Packing" to see them here.</p></div>
          ) : (
            packingItems.map(ti => (
              <div key={ti.id} className={`checklist-item ${ti.status !== 'pending' ? 'completed' : ''}`}>
                <div
                  className={`checkbox ${ti.status === 'loaded' ? 'checked' : ''}`}
                  onClick={() => toggleItemStatus(ti)}
                >
                  {ti.status === 'loaded' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }} onClick={() => toggleItemStatus(ti)}>
                  <div className="checklist-item-text">{ti.item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{containerLabel(ti.item.container)}</div>
                </div>
                {ti.status === 'skipped' && <span className="badge badge-skipped">Skipped</span>}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => skipItem(ti)}
                  style={{ fontSize: 12 }}
                >
                  {ti.status === 'skipped' ? 'Unskip' : 'Skip'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {phase === 'consumables' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Consumables Check</span>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{consumableItems.length} items</span>
          </div>
          {renderProgress(consumableItems)}
          {consumableItems.length === 0 ? (
            <div className="empty-state"><p>No consumable items. Add items with category "Consumable" to see them here.</p></div>
          ) : (
            consumableItems.map(ti => (
              <div key={ti.id} className={`checklist-item ${ti.status !== 'pending' ? 'completed' : ''}`}>
                <div
                  className={`checkbox ${ti.status === 'verified' ? 'checked' : ''}`}
                  onClick={() => toggleItemStatus(ti)}
                >
                  {ti.status === 'verified' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1 }} onClick={() => toggleItemStatus(ti)}>
                  <div className="checklist-item-text">
                    {ti.item.name}
                    {ti.item.quantity > 1 && <span style={{ color: 'var(--color-text-muted)' }}> (qty: {ti.item.quantity})</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{containerLabel(ti.item.container)}</div>
                </div>
                {ti.status === 'skipped' && <span className="badge badge-skipped">Skipped</span>}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => skipItem(ti)}
                  style={{ fontSize: 12 }}
                >
                  {ti.status === 'skipped' ? 'Unskip' : 'Skip'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {phase === 'departure' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Departure Checklist</span>
            <button className="btn btn-ghost btn-sm" onClick={() => resetChecklist('departure')}>Reset All</button>
          </div>
          {renderProgress(departureChecklist, 'completed')}
          {Object.entries(groupBySection(departureChecklist)).map(([section, items]) => (
            <div key={section} className="checklist-section">
              <div className="checklist-section-title">{section}</div>
              {items.map(item => (
                <div
                  key={item.id}
                  className={`checklist-item ${item.completed ? 'completed' : ''}`}
                  onClick={() => toggleChecklist(item)}
                >
                  <div className={`checkbox ${item.completed ? 'checked' : ''}`}>
                    {item.completed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className="checklist-item-text">{item.template.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {phase === 'setup' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Setup Checklist</span>
            <button className="btn btn-ghost btn-sm" onClick={() => resetChecklist('setup')}>Reset All</button>
          </div>
          {renderProgress(setupChecklist, 'completed')}
          {Object.entries(groupBySection(setupChecklist)).map(([section, items]) => (
            <div key={section} className="checklist-section">
              <div className="checklist-section-title">{section}</div>
              {items.map(item => (
                <div
                  key={item.id}
                  className={`checklist-item ${item.completed ? 'completed' : ''}`}
                  onClick={() => toggleChecklist(item)}
                >
                  <div className={`checkbox ${item.completed ? 'checked' : ''}`}>
                    {item.completed && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </div>
                  <span className="checklist-item-text">{item.template.title}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
