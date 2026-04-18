import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { toEmail, incubatorName, days, expectedHatch } = await request.json();

    if (!toEmail) {
      return NextResponse.json({ error: 'Falta correo destino' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.warn("No se encontró RESEND_API_KEY en variables de entorno. Simulando envío de correo.");
      console.log(`[SIMULACIÓN CORREO] Para: ${toEmail} | Lote: ${incubatorName} | Asunto: Alerta de Ovoscopia`);
      return NextResponse.json({ success: true, simulated: true });
    }

    const htmlContent = `
      <h2>Alerta de Incubación: ¡Día de Ovoscopia! 🥚🔦</h2>
      <p>Hola,</p>
      <p>El lote <strong>${incubatorName}</strong> ha alcanzado el <strong>Día ${days}</strong> de incubación.</p>
      <p>Este es el momento ideal para realizar el <strong>trasluz (ovoscopia)</strong> y descartar los huevos claros o no fértiles antes de que afecten a los demás.</p>
      <ul>
        <li><strong>Días transcurridos:</strong> ${days}</li>
        <li><strong>Fecha de eclosión estimada:</strong> ${expectedHatch}</li>
      </ul>
      <p>Por favor ingresa al sistema CodorGest para registrar cualquier huevo retirado.</p>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'CodorGest Alertas <onboarding@resend.dev>',
        to: [toEmail],
        subject: `Alerta: Día de Ovoscopia para ${incubatorName}`,
        html: htmlContent
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error al llamar a Resend:", errorData);
      return NextResponse.json({ error: 'Fallo al enviar correo mediante Resend' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Excepción en endpoint notify:", error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
