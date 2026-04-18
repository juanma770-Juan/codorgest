"use client";
import { useEffect, useState } from 'react';
import WeatherWidget from '@/components/WeatherWidget';
import { getCages, getIncubationBatches, updateIncubationBatch, IncubationBatch } from '@/lib/db';

export default function Home() {
  const [totalBirds, setTotalBirds] = useState(0);
  const [activeBatches, setActiveBatches] = useState(0);
  const [alertBatches, setAlertBatches] = useState<(IncubationBatch & { days: number })[]>([]);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Load email config
    const savedEmail = localStorage.getItem('quail_user_email');
    if (savedEmail) setUserEmail(savedEmail);

    // Load Stats
    getCages().then(cages => {
      const total = cages.reduce((sum, c) => sum + c.males + c.females, 0);
      setTotalBirds(total);
    });
    
    getIncubationBatches().then(async batches => {
      const active = batches.filter(b => b.status === 'active');
      setActiveBatches(active.length);

      // Calcular alertas de Ovoscopia (Día 8+)
      const now = new Date();
      const currentAlerts: (IncubationBatch & { days: number })[] = [];
      
      for (const batch of active) {
        // En Safari/iOS los strings 'YYYY-MM-DD HH:MM' fallan, pero new Date(string) en Chrome sí los lee.
        // Convertir espacio a T por si acaso
        const safeDateStr = batch.startDate.replace(' ', 'T');
        const start = new Date(safeDateStr);
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 8 && diffDays <= 12) {
          currentAlerts.push({ ...batch, days: diffDays });

          // Si llegamos al día 8 y no hemos madado el correo, hacerlo
          if (!batch.ovoscopiaAlertSent && savedEmail) {
            try {
              const resp = await fetch('/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  toEmail: savedEmail, 
                  incubatorName: batch.incubatorName, 
                  days: diffDays, 
                  expectedHatch: batch.expectedHatchDate 
                })
              });
              if (resp.ok) {
                 await updateIncubationBatch(batch.id, { ovoscopiaAlertSent: true });
                 console.log("Correo enviado para:", batch.incubatorName);
              }
            } catch (err) {
              console.error("No se pudo enviar correo a Resend:", err);
            }
          }
        }
      }
      setAlertBatches(currentAlerts);
    });
  }, []);

  const saveEmailConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('quail_user_email', userEmail);
    alert("Correo configurado. Las futuras alertas se enviarán allí al cargar el panel.");
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Panel de Control Principal</h2>
          <p style={{ color: 'var(--text-muted)' }}>Bienvenido al sistema de manejo de CodorGest</p>
        </div>
        <form onSubmit={saveEmailConfig} style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--card-border)' }}>
          <input 
            type="email" 
            placeholder="Correo para Alertas" 
            value={userEmail} 
            onChange={e => setUserEmail(e.target.value)} 
            style={{ padding: '0.5rem', borderRadius: '0.25rem', border: 'none', background: 'rgba(0,0,0,0.5)', color: 'white' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Guardar</button>
        </form>
      </header>

      {alertBatches.length > 0 && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '2px solid var(--danger)', borderRadius: '1rem', padding: '1rem', marginBottom: '1rem' }}>
          <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            🚨 Alerta de Ovoscopia Requerida
          </h3>
          <p style={{ color: 'white', marginBottom: '1rem' }}>Los siguientes lotes han alcanzado o superado el Día 8 de incubación. Es momento del trasluz para restar los huevos no fértiles.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alertBatches.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                <div>
                  <strong>{b.incubatorName}</strong> 
                  <span style={{ marginLeft: '1rem', color: 'var(--danger)' }}>(Día {b.days})</span>
                </div>
                <a href="/incubacion" className="btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem', background: 'var(--danger)' }}>Restar Huevos</a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem'
      }}>
        <WeatherWidget />

        <div className="glass-card">
          <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            🥚 Incubación Activa
          </h3>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
            Lotes eclosionando: <strong style={{ color: 'var(--primary-accent)' }}>{activeBatches}</strong>
          </p>
          <a href="/incubacion" className="btn-primary" style={{ display: 'inline-block' }}>Ir a Incubación</a>
        </div>

        <div className="glass-card">
          <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            🦅 Jaulas y Especímenes
          </h3>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
            Población Actual: <strong style={{ color: 'var(--primary-accent)' }}>{totalBirds} / 600</strong>
          </p>
          <a href="/jaulas" className="btn-primary" style={{ display: 'inline-block' }}>Administrar Jaulas</a>
        </div>

        <div className="glass-card">
          <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            🧺 Producción de Huevos
          </h3>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
            Control diario y rendimiento
          </p>
          <a href="/produccion" className="btn-primary" style={{ display: 'inline-block' }}>Recolectar Hoy</a>
        </div>

        <div className="glass-card">
          <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            🌾 Alimentación (Concentrado)
          </h3>
          <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
            Calculadora de raciones Finca
          </p>
          <a href="/alimentacion" className="btn-primary" style={{ display: 'inline-block' }}>Calcular Ración</a>
        </div>
      </div>
    </div>
  );
}
