"use client";
import { useEffect, useState } from 'react';

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null);

  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=3.509882&longitude=-76.431361&current_weather=true')
      .then(res => res.json())
      .then(data => setWeather(data.current_weather))
      .catch(console.error);
  }, []);

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       <h3 style={{ borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
         🌤️ Clima Actual Granja
       </h3>
       {weather ? (
         <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
           <div>
             <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-accent)' }}>
               {weather.temperature}°C
             </span>
           </div>
           <div style={{ color: 'var(--text-muted)' }}>
             <p>💨 Viento: {weather.windspeed} km/h</p>
             <p>📍 Palmira/Cali (3.50, -76.43)</p>
           </div>
         </div>
       ) : <p>Cargando clima...</p>}
    </div>
  );
}
