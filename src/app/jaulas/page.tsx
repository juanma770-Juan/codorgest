"use client";
import { useEffect, useState } from 'react';
import { getCages, updateCage, Cage } from '@/lib/db';

export default function JaulasPage() {
  const [cages, setCages] = useState<Cage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCage, setEditingCage] = useState<Cage | null>(null);

  // Stats
  const totalBirds = cages.reduce((sum, c) => sum + c.males + c.females, 0);
  const totalCapacity = 30 * 20; // 600

  const loadCages = async () => {
    setLoading(true);
    const data = await getCages();
    setCages(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCages();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCage) return;
    
    await updateCage(editingCage.id, {
      males: Number(editingCage.males),
      females: Number(editingCage.females),
      purpose: editingCage.purpose,
      birthDate: editingCage.birthDate
    });
    
    setEditingCage(null);
    loadCages();
  };

  // Group by battery naturally
  const objByBattery = [1, 2, 3].map(bId => ({
    id: bId,
    cages: cages.filter(c => c.batteryId === bId)
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Especímenes y Jaulas</h2>
          <p style={{ color: 'var(--text-muted)' }}>Gestión de las 3 baterías (600 espacios)</p>
        </div>
        <div className="glass-card" style={{ padding: '0.5rem 1.5rem' }}>
          <span style={{ fontSize: '1.2rem', color: 'var(--primary-accent)', fontWeight: 'bold' }}>
            {totalBirds} / {totalCapacity} Aves
          </span>
        </div>
      </header>

      {editingCage && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <form className="glass-card" onSubmit={handleSave} style={{ width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--primary-accent)' }}>
            <h3 style={{ color: 'var(--primary-accent)', marginBottom: '0.5rem' }}>
              Batería {editingCage.batteryId} - Piso {editingCage.floorId} - Espacio {editingCage.spaceId}
            </h3>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Propósito</label>
              <select 
                value={editingCage.purpose} 
                onChange={e => setEditingCage({...editingCage, purpose: e.target.value as any})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              >
                <option value="libre">Espacio Libre</option>
                <option value="postura">Postura (Huevos)</option>
                <option value="reproductores">Reproductores</option>
                <option value="engorde">Engorde</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Machos</label>
                <input 
                  type="number" 
                  value={editingCage.males} 
                  onChange={e => setEditingCage({...editingCage, males: Number(e.target.value)})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Hembras</label>
                <input 
                  type="number" 
                  value={editingCage.females} 
                  onChange={e => setEditingCage({...editingCage, females: Number(e.target.value)})}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fecha de Nacimiento (Aprox.)</label>
              <input 
                type="date" 
                value={editingCage.birthDate || ""} 
                onChange={e => setEditingCage({...editingCage, birthDate: e.target.value})}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>Guardar</button>
              <button type="button" className="btn-primary" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)', flex: 1 }} onClick={() => setEditingCage(null)}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Cargando celdas...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {objByBattery.map(battery => (
            <div key={battery.id}>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', color: 'var(--text-main)' }}>
                🔋 Batería {battery.id}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {battery.cages.map(cage => {
                  const birds = cage.males + cage.females;
                  const isFree = birds === 0 && cage.purpose === 'libre';
                  let statusColor = 'var(--text-muted)';
                  if (cage.purpose === 'postura') statusColor = 'var(--primary-accent)';
                  if (cage.purpose === 'engorde') statusColor = 'var(--danger)';
                  if (cage.purpose === 'reproductores') statusColor = 'var(--success)';

                  return (
                    <div key={cage.id} className="glass-card" style={{ padding: '1rem', borderLeft: `4px solid ${statusColor}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ margin: 0 }}>Piso {cage.floorId} <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>• Lado {cage.spaceId}</span></h4>
                        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '1rem', background: isFree ? 'rgba(255,255,255,0.05)' : statusColor, color: isFree ? 'inherit' : '#111', fontWeight: 'bold' }}>
                          {cage.purpose.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '1rem 0' }}>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{cage.females}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hembras</span>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '1.2rem', fontWeight: 'bold' }}>{cage.males}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Machos</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {cage.birthDate ? `Nacidos: ${cage.birthDate}` : 'Sin fecha'}
                        </span>
                        <button 
                          onClick={() => setEditingCage(cage)} 
                          style={{ background: 'none', border: '1px solid var(--card-border)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          ✏️ Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
