"use client";
import { useEffect, useState } from 'react';
import { getCages, Cage, getEggLogsByDate, saveEggLog, EggLog } from '@/lib/db';

export default function ProduccionPage() {
  const [cages, setCages] = useState<Cage[]>([]);
  const [logs, setLogs] = useState<Record<string, EggLog>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const allCages = await getCages();
    // Only cages that can produce eggs
    const producers = allCages.filter(c => (c.purpose === 'postura' || c.purpose === 'reproductores') && c.females > 0);
    setCages(producers);

    const dayLogs = await getEggLogsByDate(date);
    const logMap: Record<string, EggLog> = {};
    dayLogs.forEach(l => logMap[l.cageId] = l);
    setLogs(logMap);
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const handleUpdateLog = (cageId: string, field: 'goodEggs' | 'brokenEggs' | 'incubatorEggs', value: string) => {
    const num = Number(value);
    const newLog = logs[cageId] || { cageId, date, goodEggs: 0, brokenEggs: 0, incubatorEggs: 0 };
    newLog[field] = num;
    
    setLogs({ ...logs, [cageId]: newLog });
    
    // Auto save
    saveEggLog(newLog);
  };

  // Group by battery naturally
  const objByBattery = [1, 2, 3].map(bId => ({
    id: bId,
    cages: cages.filter(c => c.batteryId === bId)
  })).filter(b => b.cages.length > 0);

  let totalGood = 0;
  let totalBroken = 0;
  let totalInc = 0;
  let totalFemales = 0;

  Object.values(logs).forEach(l => {
    totalGood += l.goodEggs || 0;
    totalBroken += l.brokenEggs || 0;
    totalInc += l.incubatorEggs || 0;
  });

  cages.forEach(c => totalFemales += c.females);
  const totalEggs = totalGood + totalBroken + totalInc;
  const produccionRendimiento = totalFemales > 0 ? ((totalEggs / totalFemales) * 100).toFixed(1) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Producción de Huevos</h2>
          <p style={{ color: 'var(--text-muted)' }}>Registro diario por jaula productora</p>
        </div>
        <div>
          <input 
            type="date" 
            value={date} 
            onChange={e => setDate(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--primary-accent)', outline: 'none', fontSize: '1.2rem'}}
          />
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-muted)' }}>Huevos para Venta</h4>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>{totalGood}</span>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-muted)' }}>Para Incubadora</h4>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-accent)' }}>{totalInc}</span>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-muted)' }}>Rotos / Descarte</h4>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>{totalBroken}</span>
        </div>
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <h4 style={{ color: 'var(--text-muted)' }}>Rendimiento Postura</h4>
          <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{produccionRendimiento}%</span>
        </div>
      </div>

      {loading ? (
        <p>Cargando jaulas productoras...</p>
      ) : cages.length === 0 ? (
        <p style={{ color: 'var(--primary-accent)' }}>No hay jaulas marcadas como Postura o Reproductores con hembras ingresadas.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {objByBattery.map(battery => (
            <div key={battery.id}>
              <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
                🔋 Batería {battery.id}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {battery.cages.map(cage => {
                   const log = logs[cage.id] || { goodEggs: 0, brokenEggs: 0, incubatorEggs: 0 };
                   return (
                     <div key={cage.id} className="glass-card" style={{ padding: '1rem', borderLeft: cage.purpose === 'reproductores' ? '4px solid var(--success)' : '4px solid var(--primary-accent)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                           <h4 style={{ margin: 0 }}>Piso {cage.floorId} - Lado {cage.spaceId}</h4>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cage.females} Hembras</span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <label style={{ fontSize: '0.9rem' }}>Venta/Comerciales</label>
                             <input type="number" min="0" value={log.goodEggs || ""} onChange={e => handleUpdateLog(cage.id, 'goodEggs', e.target.value)} style={{ width: '80px', padding: '0.5rem', borderRadius: '0.25rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--success)', textAlign: 'center' }} />
                           </div>
                           
                           {cage.purpose === 'reproductores' && (
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <label style={{ fontSize: '0.9rem' }}>Para Incubadora</label>
                               <input type="number" min="0" value={log.incubatorEggs || ""} onChange={e => handleUpdateLog(cage.id, 'incubatorEggs', e.target.value)} style={{ width: '80px', padding: '0.5rem', borderRadius: '0.25rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--primary-accent)', textAlign: 'center' }} />
                             </div>
                           )}

                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <label style={{ fontSize: '0.9rem' }}>Rotos</label>
                             <input type="number" min="0" value={log.brokenEggs || ""} onChange={e => handleUpdateLog(cage.id, 'brokenEggs', e.target.value)} style={{ width: '80px', padding: '0.5rem', borderRadius: '0.25rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--danger)', textAlign: 'center' }} />
                           </div>
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
