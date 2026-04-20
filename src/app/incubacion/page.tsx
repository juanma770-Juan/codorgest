"use client";
import { useEffect, useState } from 'react';
import { getIncubationBatches, addIncubationBatch, completeIncubationBatch, updateIncubationBatch, deleteIncubationBatch, IncubationBatch } from '@/lib/db';

export default function IncubacionPage() {
  const [batches, setBatches] = useState<IncubationBatch[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [incubator, setIncubator] = useState("Incubadora Pequeña (24)");
  const [eggsLoaded, setEggsLoaded] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  
  // Nuevo: Notas y Temperatura
  const [initNotes, setInitNotes] = useState("");
  const [initTemp, setInitTemp] = useState("");
  const [initHum, setInitHum] = useState("");

  // Manage state
  const [manageId, setManageId] = useState<string | null>(null);
  const [manageType, setManageType] = useState<"complete" | "discard" | "notes" | null>(null);
  const [hatched, setHatched] = useState("");
  const [infertile, setInfertile] = useState("");
  const [discardAmount, setDiscardAmount] = useState("");
  const [selectedLogIdx, setSelectedLogIdx] = useState<number | null>(null);

  const loadBatches = async () => {
    setLoading(true);
    const data = await getIncubationBatches();
    setBatches(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBatches();
  }, []);

  const handleOpenForm = () => {
    if (!showForm) {
      const now = new Date();
      const localISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setStartDateTime(localISO);
    }
    setShowForm(!showForm);
  };

  const clearForm = () => {
    setEggsLoaded("");
    setInitNotes("");
    setInitTemp("");
    setInitHum("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eggsLoaded || Number(eggsLoaded) <= 0) return;
    
    const capacity = incubator.includes("24") ? 24 : 96;
    if (Number(eggsLoaded) > capacity) {
      alert(`La cantidad no puede superar la capacidad de la incubadora (${capacity})`);
      return;
    }

    // Default expected hatch date is +17 days (approx 400 hours)
    const start = new Date(startDateTime);
    const expected = new Date(start.getTime() + 17 * 24 * 60 * 60 * 1000);
    const expectedISO = new Date(expected.getTime() - expected.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const logs = [];
    if (initTemp || initHum || initNotes) {
      logs.push({ 
        date: startDateTime.replace('T', ' '), 
        temp: initTemp ? Number(initTemp) : 0, 
        humidity: initHum ? Number(initHum) : 0,
        note: initNotes
      });
    }

    try {
      await addIncubationBatch({
        incubatorName: incubator,
        capacity,
        startDate: startDateTime.replace('T', ' '),
        expectedHatchDate: expectedISO.replace('T', ' '),
        eggsLoaded: Number(eggsLoaded),
        notes: initNotes,
        temperatureLogs: logs
      });

      setShowForm(false);
      clearForm();
      loadBatches();
    } catch (err) {
      console.error('Error al guardar lote:', err);
      alert('Error al guardar el lote. Revisa la consola para más detalles.');
    }
  };

  const handleUpdateNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageId) return;
    const batch = batches.find(b => b.id === manageId);
    if (!batch) return;

    const newLogs = [...(batch.temperatureLogs || [])];
    const now = new Date();
    const dateStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' ');
    
    newLogs.push({ 
      date: dateStr, 
      temp: initTemp ? Number(initTemp) : 0, 
      humidity: initHum ? Number(initHum) : 0, 
      note: initNotes 
    });

    await updateIncubationBatch(manageId, {
      temperatureLogs: newLogs
    });

    setManageId(null);
    setManageType(null);
    clearForm();
    setSelectedLogIdx(null);
    loadBatches();
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageId) return;
    await completeIncubationBatch(manageId, Number(hatched), Number(infertile));
    setManageId(null);
    setManageType(null);
    setHatched("");
    setInfertile("");
    loadBatches();
  };

  const handleDiscard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageId) return;
    const batch = batches.find(b => b.id === manageId);
    if (!batch) return;

    const currentEggs = batch.eggsLoaded;
    const discard = Number(discardAmount);
    if (discard <= 0 || discard > currentEggs) {
      alert("Cantidad inválida");
      return;
    }

    const currentDiscarded = batch.discardedCount || 0;

    // Grabación automática en la bitácora
    const lastLog = batch.temperatureLogs && batch.temperatureLogs.length > 0 ? batch.temperatureLogs[batch.temperatureLogs.length - 1] : null;
    const dateStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16).replace('T', ' ');
    const newLogs = [...(batch.temperatureLogs || []), {
      date: dateStr,
      temp: lastLog ? lastLog.temp : 0,
      humidity: lastLog ? lastLog.humidity : 0,
      note: `🗑️ Retiro de trasluz: Se descartaron ${discard} huevos no fértiles.`
    }];

    await updateIncubationBatch(manageId, {
      eggsLoaded: currentEggs - discard,
      discardedCount: currentDiscarded + discard,
      temperatureLogs: newLogs
    });

    setManageId(null);
    setManageType(null);
    setDiscardAmount("");
    loadBatches();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este lote por completo? Esta acción no se puede deshacer.")) {
      try {
        await deleteIncubationBatch(id);
        loadBatches();
      } catch (err) {
        console.error('Error al eliminar lote:', err);
        alert('Error al eliminar el lote. Revisa la consola para más detalles.');
      }
    }
  };

  const openNotesEditor = (batch: IncubationBatch) => {
    setManageId(batch.id);
    setManageType("notes");
    setInitNotes("");
    setInitTemp("");
    setInitHum("");
    setSelectedLogIdx(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Módulo de Incubación</h2>
          <p style={{ color: 'var(--text-muted)' }}>Control de lotes de huevos y eclosiones</p>
        </div>
        <button className="btn-primary" onClick={handleOpenForm}>
          {showForm ? 'Cancelar' : '+ Nuevo Lote'}
        </button>
      </header>

      {showForm && (
        <form className="glass-card" onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--primary-accent)' }}>
          <h3 style={{ color: 'var(--primary-accent)' }}>Registrar Nuevo Lote</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Incubadora</label>
              <select 
                value={incubator} 
                onChange={e => setIncubator(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              >
                <option>Incubadora Pequeña (24 huevos)</option>
                <option>Incubadora Grande (96 huevos)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Cantidad de Huevos</label>
              <input 
                type="number" 
                value={eggsLoaded} 
                onChange={e => setEggsLoaded(e.target.value)}
                max={incubator.includes("24") ? 24 : 96}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fecha y Hora de Inicio</label>
              <input 
                type="datetime-local" 
                value={startDateTime} 
                onChange={e => setStartDateTime(e.target.value)}
                required
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Temp. Inicial (°C) - Opcional</label>
              <input 
                type="number" step="0.1" 
                value={initTemp} 
                onChange={e => setInitTemp(e.target.value)}
                placeholder="Ej. 37.7"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Humedad Inicial (%) - Opcional</label>
              <input 
                type="number" step="1" 
                value={initHum} 
                onChange={e => setInitHum(e.target.value)}
                placeholder="Ej. 60"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }}
              />
            </div>
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem' }}>Observaciones Iniciales (Opcional)</label>
             <textarea 
               value={initNotes}
               onChange={e => setInitNotes(e.target.value)}
               placeholder="Anota cualquier particularidad de los huevos, genética, limpieza..."
               rows={3}
               style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)', fontFamily: 'inherit' }}
             />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Guardar Lote</button>
        </form>
      )}

      {manageId && manageType === "notes" && (
        <form className="glass-card" onSubmit={handleUpdateNotes} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderColor: '#3b82f6' }}>
          <h3 style={{ color: '#3b82f6' }}>Añadir Observación y Lectura</h3>
          
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '0.5rem', maxHeight: '180px', overflowY: 'auto', fontSize: '0.85rem' }}>
            <h4 style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem' }}>Historial y Notas Específicas</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>Haz click sobre una lectura para ver su observación.</p>
            {batches.find(b => b.id === manageId)?.temperatureLogs?.length ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {batches.find(b => b.id === manageId)?.temperatureLogs.map((log, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => setSelectedLogIdx(idx === selectedLogIdx ? null : idx)}
                    style={{ 
                      display: 'flex', flexDirection: 'column', color: '#ccc', cursor: 'pointer', 
                      background: selectedLogIdx === idx ? 'rgba(255,255,255,0.05)' : 'transparent', 
                      padding: '0.3rem', borderRadius: '0.25rem' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{log.date}</span>
                      <strong>{log.temp}°C | {log.humidity}%</strong>
                    </div>
                    {selectedLogIdx === idx && (
                      <div style={{ marginTop: '0.5rem', color: 'var(--text-main)', fontSize: '0.85rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--primary-accent)' }}>
                        {log.note || <span style={{ color: 'var(--text-muted)' }}>Sin observaciones adicionales.</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>No hay mediciones registradas aún.</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nueva Temp. (°C)</label>
              <input type="number" step="0.1" value={initTemp} onChange={e => setInitTemp(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nueva Humedad (%)</label>
              <input type="number" step="1" value={initHum} onChange={e => setInitHum(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }} />
            </div>
          </div>

          <div>
             <label style={{ display: 'block', marginBottom: '0.5rem' }}>Observaciones (Bitácora)</label>
             <textarea 
               value={initNotes}
               onChange={e => setInitNotes(e.target.value)}
               rows={5}
               style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)', fontFamily: 'inherit' }}
             />
             <small style={{ color: 'var(--text-muted)' }}>Agrega la fecha y anota cualquier eventualidad o apunte del trasluz.</small>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ background: '#3b82f6', flex: 1 }}>Guardar Anotación</button>
            <button type="button" className="btn-primary" style={{ background: 'var(--card-bg)', color: 'white', flex: 1 }} onClick={() => {setManageId(null); setManageType(null); clearForm();}}>Cancelar</button>
          </div>
        </form>
      )}

      {manageId && manageType === "complete" && (
        <form className="glass-card" onSubmit={handleComplete} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderColor: 'var(--success)' }}>
          <h3 style={{ color: 'var(--success)' }}>Completar Ciclo de Incubación</h3>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Huevos Eclosionados (Exitosos)</label>
            <input type="number" required value={hatched} onChange={e => setHatched(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Huevos No Nacidos (Fallas al nacer)</label>
            <input type="number" required value={infertile} onChange={e => setInfertile(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ background: 'var(--success)', flex: 1 }}>Finalizar Lote</button>
            <button type="button" className="btn-primary" style={{ background: 'var(--card-bg)', color: 'white', flex: 1 }} onClick={() => {setManageId(null); setManageType(null);}}>Cancelar</button>
          </div>
        </form>
      )}

      {manageId && manageType === "discard" && (
        <form className="glass-card" onSubmit={handleDiscard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderColor: 'var(--primary-accent)' }}>
          <h3 style={{ color: 'var(--primary-accent)' }}>Descartar Huevos No Fértiles (Trasluz)</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Esto restará huevos del lote actual si al revisarlos al trasluz detectaste huevos claros o no fértiles.</p>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Cantidad de Huevos No Fértiles a Retirar</label>
            <input type="number" required value={discardAmount} onChange={e => setDiscardAmount(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid var(--card-border)' }} />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>Confirmar Retiro</button>
            <button type="button" className="btn-primary" style={{ background: 'var(--card-bg)', color: 'white', flex: 1 }} onClick={() => {setManageId(null); setManageType(null);}}>Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Cargando lotes...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' }}>
          {batches.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No hay lotes registrados.</p> : null}
          
          {batches.map(batch => {
            const isActive = batch.status === 'active';
            const latestLog = batch.temperatureLogs && batch.temperatureLogs.length > 0 ? batch.temperatureLogs[batch.temperatureLogs.length - 1] : null;

            return (
              <div key={batch.id} className="glass-card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, padding: '0.25rem 1rem', fontSize: '0.8rem', fontWeight: 'bold', background: isActive ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isActive ? 'var(--primary-accent)' : 'var(--success)', borderBottomLeftRadius: '0.5rem', zIndex: 1 }}>
                  {isActive ? 'En Proceso' : 'Completado'}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>{batch.incubatorName}</h3>
                  <button onClick={() => handleDelete(batch.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1.2rem', position: 'relative', zIndex: 2, padding: '0.5rem'}} title="Eliminar Lote">
                    🗑️
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  <p><strong>Inicio:</strong> {batch.startDate}</p>
                  <p><strong>Ocupación:</strong> <span style={{ color: 'var(--text-main)' }}>{batch.eggsLoaded} / {batch.capacity}</span></p>
                  <p><strong>Eclosión Est.:</strong> <span style={{ color: isActive ? 'var(--primary-accent)' : 'inherit' }}>{batch.expectedHatchDate}</span></p>
                  {batch.discardedCount ? <p><strong>Descartados:</strong> <span style={{ color: 'var(--danger)' }}>{batch.discardedCount}</span></p> : null}
                  
                  {!isActive && (
                    <>
                      <p style={{ color: 'var(--success)' }}><strong>Nacimientos:</strong> {batch.hatchedCount}</p>
                      <p style={{ color: 'var(--danger)' }}><strong>Fallas Final:</strong> {batch.infertileCount}</p>
                    </>
                  )}
                </div>

                <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Última Lectura:</span>
                    <strong>{latestLog ? `${latestLog.temp}°C | ${latestLog.humidity}%` : 'Sin registros'}</strong>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    <strong>Observaciones:</strong> {batch.notes || "Ninguna."}
                  </div>
                </div>

                {isActive && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => openNotesEditor(batch)} 
                      className="btn-primary" 
                      style={{ flex: 1, padding: '0.5rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '0.85rem' }}
                    >
                      Anotar (Bitácora)
                    </button>
                    <button 
                      onClick={() => { setManageId(batch.id); setManageType('discard'); }} 
                      className="btn-primary" 
                      style={{ flex: 1, padding: '0.5rem', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem' }}
                    >
                      Restar Huevos
                    </button>
                    <button 
                      onClick={() => { setManageId(batch.id); setManageType('complete'); }} 
                      className="btn-primary" 
                      style={{ flex: 1.5, padding: '0.5rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem' }}
                    >
                      Marcar Eclosión
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
