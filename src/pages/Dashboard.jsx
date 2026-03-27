import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({ containers: 0, items: 0, permanent: 0, consumable: 0, packing: 0, trips: 0 })
  const [activeTrip, setActiveTrip] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      const [containersRes, itemsRes, tripsRes] = await Promise.all([
        supabase.from('containers').select('id', { count: 'exact', head: true }),
        supabase.from('items').select('id, category'),
        supabase.from('trips').select('*').not('status', 'eq', 'returning').order('created_at', { ascending: false }).limit(1),
      ])

      const items = itemsRes.data || []
      setStats({
        containers: containersRes.count || 0,
        items: items.length,
        permanent: items.filter(i => i.category === 'permanent').length,
        consumable: items.filter(i => i.category === 'consumable').length,
        packing: items.filter(i => i.category === 'packing').length,
        trips: 0,
      })

      if (tripsRes.data?.length > 0 && tripsRes.data[0].status !== 'returning') {
        setActiveTrip(tripsRes.data[0])
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">2020 Grand Design 31MB</p>
        </div>
      </div>

      <div className="stats-grid">
        <Link to="/containers" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-value">{stats.containers}</div>
          <div className="stat-label">Containers</div>
        </Link>
        <Link to="/items" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-value">{stats.items}</div>
          <div className="stat-label">Total Items</div>
        </Link>
        <Link to="/items" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-value">{stats.packing}</div>
          <div className="stat-label">Packing Items</div>
        </Link>
        <Link to="/items" className="stat-card" style={{ textDecoration: 'none' }}>
          <div className="stat-value">{stats.consumable}</div>
          <div className="stat-label">Consumables</div>
        </Link>
      </div>

      {activeTrip ? (
        <Link to={`/trips/${activeTrip.id}`} className="card" style={{ textDecoration: 'none', display: 'block', marginBottom: 24 }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 4 }}>Active Trip</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{activeTrip.name}</div>
            </div>
            <span className={`trip-status trip-status-${activeTrip.status}`}>
              {activeTrip.status}
            </span>
          </div>
        </Link>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-body" style={{ textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 12 }}>No active trip</p>
            <Link to="/trips" className="btn btn-primary">Plan a Trip</Link>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <Link to="/search" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Search Items</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Find anything in your RV</div>
            </div>
          </div>
        </Link>
        <Link to="/containers" className="card" style={{ textDecoration: 'none', display: 'block' }}>
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Manage Storage</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Containers and locations</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
