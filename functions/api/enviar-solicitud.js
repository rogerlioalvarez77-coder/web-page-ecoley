// Cloudflare Pages Function — recibe el formulario de solicitud y envía un
// correo con los datos usando la API de Resend.
//
// Variables de entorno necesarias (configúralas en Cloudflare Pages ->
// Settings -> Environment variables, NUNCA las pongas en el código):
//   RESEND_API_KEY  (secreta) — la API key de Resend.
//   TO_EMAIL        (opcional) — a dónde llegan las solicitudes.
//                     Por defecto: atencionalcliente@ecoleysv.com
//   FROM_EMAIL      (opcional) — remitente del correo.
//                     Por defecto: onboarding@resend.dev (dominio de pruebas
//                     de Resend; solo entrega al correo dueño de la cuenta).
//                     Cuando verifiques un dominio propio en Resend, cambia
//                     esto a algo como 'Ecoley <notificaciones@ecoleysv.com>'.

const REQUIRED_FIELDS = [
  'nombre', 'dui', 'telefono', 'correo', 'lugarTrabajo', 'sueldo',
  'direccion', 'servicioInteresado', 'servicioEspecifico'
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY no configurada' }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Formulario inválido' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const data = {};
  for (const key of REQUIRED_FIELDS.concat(['comentarios', 'consentimiento'])) {
    data[key] = form.get(key) || '';
  }
  const missing = REQUIRED_FIELDS.filter((k) => !String(data[k]).trim());
  if (missing.length) {
    return new Response(JSON.stringify({ error: 'Campos faltantes: ' + missing.join(', ') }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const rows = [
    ['Nombre', data.nombre],
    ['DUI', data.dui],
    ['Teléfono', data.telefono],
    ['Correo', data.correo],
    ['Lugar de trabajo', data.lugarTrabajo],
    ['Sueldo', data.sueldo],
    ['Dirección', data.direccion],
    ['Servicio de interés', data.servicioInteresado],
    ['Servicio específico', data.servicioEspecifico],
    ['Comentarios', data.comentarios || '(sin comentarios)']
  ];
  const html = `
    <h2>Nueva solicitud — Ecoley</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="font-weight:600;vertical-align:top">${escapeHtml(label)}</td>
          <td>${escapeHtml(value)}</td>
        </tr>`).join('')}
    </table>
  `;

  const payload = {
    from: env.FROM_EMAIL || 'onboarding@resend.dev',
    to: [env.TO_EMAIL || 'atencionalcliente@ecoleysv.com'],
    reply_to: data.correo,
    subject: `Nueva solicitud de ${data.nombre} — ${data.servicioInteresado}`,
    html
  };

  const archivo = form.get('archivo');
  if (archivo && typeof archivo === 'object' && 'arrayBuffer' in archivo && archivo.size > 0) {
    payload.attachments = [{
      filename: archivo.name || 'adjunto',
      content: await fileToBase64(archivo)
    }];
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text().catch(() => '');
    return new Response(JSON.stringify({ error: 'Resend rechazó el envío', detail }), {
      status: 502,
      headers: { 'content-type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
