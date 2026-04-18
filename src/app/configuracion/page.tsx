"use client";
import { useState, useEffect } from 'react';

export default function ConfiguracionPage() {
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    const savedEmail = localStorage.getItem('quail_user_email');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    localStorage.setItem('quail_user_email', email);
    setSaved(true);
    setTestResult(null);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTestEmail = async () => {
    if (!email) {
      alert("Primero guarda un correo electrónico.");
      return;
    }
    setTesting(true);
    setTestResult(null);

    try {
      const resp = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: email,
          incubatorName: "Incubadora de Prueba",
          days: 8,
          expectedHatch: "2026-05-01 10:00"
        })
      });

      const data = await resp.json();

      if (resp.ok) {
        if (data.simulated) {
          setTestResult({ ok: false, msg: "⚠️ La API Key de Resend no está configurada en el servidor. El correo se simuló pero no se envió realmente. Configura RESEND_API_KEY en Vercel." });
        } else {
          setTestResult({ ok: true, msg: "✅ ¡Correo de prueba enviado! Revisa tu bandeja de entrada (y spam)." });
        }
      } else {
        setTestResult({ ok: false, msg: `❌ Error al enviar: ${data.error || 'Error desconocido'}` });
      }
    } catch (err) {
      setTestResult({ ok: false, msg: "❌ No se pudo conectar con el servidor de correos." });
    } finally {
      setTesting(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: '1px solid var(--card-border)',
    fontSize: '1rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️ Configuración</h2>
        <p style={{ color: 'var(--text-muted)' }}>Ajustes generales del sistema CodorGest</p>
      </header>

      {/* Sección de Correo */}
      <div className="glass-card" style={{ border: '1px solid var(--card-border)' }}>
        <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📧 Correo para Alertas
        </h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
          Este correo recibirá las alertas automáticas de ovoscopia (Día 8) y cualquier otra notificación del sistema.
        </p>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Dirección de Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ejemplo@correo.com"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" className="btn-primary" style={{ flex: 1, padding: '0.75rem' }}>
              {saved ? '✅ Guardado' : 'Guardar Correo'}
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={handleTestEmail}
              disabled={testing}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}
            >
              {testing ? '⏳ Enviando...' : '🧪 Enviar Correo de Prueba'}
            </button>
          </div>
        </form>

        {testResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: testResult.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${testResult.ok ? 'var(--success)' : 'var(--danger)'}`,
            color: testResult.ok ? 'var(--success)' : '#fca5a5',
            fontSize: '0.9rem'
          }}>
            {testResult.msg}
          </div>
        )}
      </div>

      {/* Info del Sistema */}
      <div className="glass-card" style={{ border: '1px solid var(--card-border)' }}>
        <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ℹ️ Información del Sistema
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          <p><strong>Versión:</strong> CodorGest v1.0</p>
          <p><strong>Base de Datos:</strong> Supabase (PostgreSQL en la nube)</p>
          <p><strong>Hosting:</strong> Vercel</p>
          <p><strong>Alertas:</strong> Resend (Correo transaccional)</p>
        </div>
      </div>
    </div>
  );
}
