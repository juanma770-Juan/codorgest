"use client";
import { useEffect, useState } from 'react';
import { getCages, Cage } from '@/lib/db';

export default function AlimentacionPage() {
  const [cages, setCages] = useState<Cage[]>([]);
  const [loading, setLoading] = useState(true);

  // Consumo promedio en gramos diarios (Finca)
  const [rateAdult, setRateAdult] = useState(25); 
  const [rateEngorde, setRateEngorde] = useState(30);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const allCages = await getCages();
      setCages(allCages);
      setLoading(false);
    };
    loadData();
  }, []);

  // Calculate distributions
  let totalGramaje = 0;
  
  const byBattery = [1, 2, 3].map(bId => {
    const batteryCages = cages.filter(c => c.batteryId === bId);
    let batteryGrams = 0;
    
    const spaces: { id: string, floorId: number, spaceId: number, grams: number }[] = [];
    
    batteryCages.forEach(c => {
      const birds = c.males + c.females;
      let spaceGrams = 0;
      if (birds > 0) {
        const rate = c.purpose === 'engorde' ? rateEngorde : rateAdult;
        spaceGrams = birds * rate;
      }
      spaces.push({ 
        id: c.id, 
        floorId: c.floorId,
        spaceId: c.spaceId,
        grams: spaceGrams 
      });
      batteryGrams += spaceGrams;
    });

    // Ensure sorted nicely
    spaces.sort((a,b) => {
      if (a.floorId === b.floorId) return a.spaceId - b.spaceId;
      return a.floorId - b.floorId;
    });

    totalGramaje += batteryGrams;

    return {
      id: bId,
      grams: batteryGrams,
      spaces: spaces
    };
  });

  const bultos = (totalGramaje / 1000) / 40; // Assuming 40kg bags

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Calculadora de Alimentación</h2>
        <p style={{ color: 'var(--text-muted)' }}>Cálculo de raciones basado en concentrado marca Finca</p>
      </header>

      <div className="glass-card" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--primary-accent)' }}>Ajustar Tasa de Consumo</h3>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Postura y Reproductores (g/ave/día)</label>
            <input 
              type="number" 
              value={rateAdult} 
              onChange={e => setRateAdult(Number(e.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--primary-accent)' }}
            />
            <small style={{ color: 'var(--text-muted)' }}>* Regularmente 22g a 27g.</small>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Engorde (g/ave/día)</label>
            <input 
              type="number" 
              value={rateEngorde} 
              onChange={e => setRateEngorde(Number(e.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--primary-accent)' }}
            />
          </div>
        </div>

        <div style={{ flex: 2, minWidth: '300px', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', flex: 1, textAlign: 'center' }}>
            <h4 style={{ color: 'var(--text-muted)' }}>Consumo Total Diario</h4>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>
              {(totalGramaje / 1000).toFixed(2)} kg
            </span>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', flex: 1, textAlign: 'center' }}>
            <h4 style={{ color: 'var(--text-muted)' }}>Bultos (40kg) por Mes</h4>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
              {(bultos * 30).toFixed(1)} 
            </span>
          </div>
        </div>
      </div>

      <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>Distribución por Baterías y Espacios</h3>
      
      {loading ? <p>Midiendo consumo...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {byBattery.map(battery => (
             <div key={battery.id} className="glass-card" style={{ borderLeft: '4px solid var(--primary-accent)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '1.2rem', margin: 0 }}>Batería {battery.id}</h4>
                <span style={{ padding: '0.2rem 0.5rem', background: 'var(--primary-accent)', color: 'black', borderRadius: '1rem', fontWeight: 'bold', fontSize: '0.8rem' }}>
                  Total: {(battery.grams / 1000).toFixed(2)} kg
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {battery.spaces.map(sp => (
                  <div key={sp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Piso {sp.floorId} - Esp {sp.spaceId}</span>
                    <strong style={{ color: sp.grams === 0 ? 'var(--text-muted)' : 'white', fontSize: '0.9rem' }}>
                      {sp.grams > 0 ? `${sp.grams} g` : '-'}
                    </strong>
                  </div>
                ))}
              </div>
              
              <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                Medida calculada en gramos para servir individualmente en cada bandeja.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
