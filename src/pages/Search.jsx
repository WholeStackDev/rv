import { useState, useEffect, useMemo } from 'react'
import Fuse from 'fuse.js'
import { supabase } from '../lib/supabase'

export default function Search() {
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTrip, setActiveTrip] = useState(null)
  const [tripItems, setTripItems] = useState([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [itemsRes, tripRes] = await Promise.all([
      supabase.from('items').select('*, container:containers(name, sub_location)').order('name'),
      supabase.from('trips').select('*').not('status', 'eq', 'returning').order('created_at', { ascending: false }).limit(1),
    ])
    setItems(itemsRes.data || [])

    if (tripRes.data?.length > 0) {
      setActiveTrip(tripRes.data[0])
      const { data: ti } = await supabase.from('trip_items').select('*').eq('trip_id', tripRes.data[0].id)
      setTripItems(ti || [])
    }
    setLoading(false)
  }

  const fuse = useMemo(() => new Fuse(items, {
    keys: ['name', 'container.name', 'container.sub_location', 'notes', 'category'],
    threshold: 0.4,
    includeScore: true,
  }), [items])

  const results = query.trim()
    ? fuse.search(query).map(r => r.item)
    : items

  function containerLabel(c) {
    if (!c) return null
    return c.sub_location ? `${c.name} \u2192 ${c.sub_location}` : c.name
  }

  function getTripStatus(itemId) {
    if (!activeTrip) return null
    const ti = tripItems.find(t => t.item_id === itemId)
    return ti?.status || null
  }

  function getTripStatusLabel(status) {
    switch (status) {
      case 'loaded': return 'Loaded'
      case 'verified': return 'Verified'
      case 'skipped': return 'Skipped'
      case 'pending': return 'Pending'
      default: return null
    }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h1 className="page-title">Search</h1>
      </div>

      <div className="search-container" style={{ marginBottom: 20 }}>
        <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className="search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search items, containers, notes..."
          autoFocus
        />
      </div>

      {activeTrip && (
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Showing status for: <strong style={{ color: 'var(--color-text)' }}>{activeTrip.name}</strong>
        </div>
      )}

      {results.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <p>{query ? `No results for "${query}"` : 'No items in the system yet.'}</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-light)', fontSize: 13, color: 'var(--color-text-muted)' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </div>
          {results.map(item => {
            const tripStatus = getTripStatus(item.id)
            return (
              <div key={item.id} className="search-result">
                <div className="search-result-name">{item.name}</div>
                {item.container && (
                  <div className="search-result-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                    {containerLabel(item.container)}
                  </div>
                )}
                <div className="search-result-meta">
                  <span className={`badge badge-${item.category}`}>{item.category}</span>
                  {item.quantity > 1 && <span className="badge badge-pending">qty: {item.quantity}</span>}
                  {tripStatus && (
                    <span className={`badge badge-${tripStatus}`}>
                      {getTripStatusLabel(tripStatus)}
                    </span>
                  )}
                  {item.category === 'permanent' && !tripStatus && (
                    <span className="badge badge-permanent">Always in RV</span>
                  )}
                </div>
                {item.notes && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 6 }}>{item.notes}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
