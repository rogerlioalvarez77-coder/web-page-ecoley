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
//
// Protección adicional recomendada (no se puede fijar solo desde este
// archivo): este endpoint es público, así que en Cloudflare Pages ->
// dominio -> Security -> WAF -> Rate limiting rules, agrega una regla sobre
// /api/enviar-solicitud (ej. máximo 5 solicitudes por IP cada 10 minutos).

const MAX_FILE_BYTES = 10 * 1024 * 1024; // debe coincidir con el límite del cliente en Ecoley.dc.html (onFile)

const FIELDS = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'dui', label: 'DUI' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'correo', label: 'Correo' },
  { key: 'lugarTrabajo', label: 'Lugar de trabajo' },
  { key: 'sueldo', label: 'Sueldo' },
  { key: 'direccion', label: 'Dirección' },
  { key: 'servicioInteresado', label: 'Servicio de interés' },
  { key: 'servicioEspecifico', label: 'Servicio específico' }
];
const REQUIRED_FIELDS = FIELDS.map((f) => f.key);

const DUI_RE = /^\d{8}-?\d$/;
const PHONE_RE = /^\d{8}$/;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Recorta espacios y elimina saltos de línea: evita que un campo con \r\n
// termine inyectando encabezados extra en el correo (subject/reply_to).
function cleanField(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return jsonResponse({ error: 'RESEND_API_KEY no configurada' }, 500);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'Formulario inválido' }, 400);
  }

  // Honeypot: campo oculto (ver Ecoley.dc.html) que un usuario real nunca
  // llena. Si viene lleno, es un bot — respondemos "ok" sin enviar el correo
  // para no delatar el filtro.
  if (cleanField(form.get('honeypot'))) {
    return jsonResponse({ ok: true }, 200);
  }

  const archivo = form.get('archivo');
  const hasFile = archivo && typeof archivo === 'object' && 'arrayBuffer' in archivo && archivo.size > 0;
  if (hasFile && archivo.size > MAX_FILE_BYTES) {
    return jsonResponse({ error: 'El archivo adjunto supera el máximo permitido (10 MB).' }, 413);
  }

  const data = {};
  for (const { key } of FIELDS) data[key] = cleanField(form.get(key));
  data.comentarios = cleanField(form.get('comentarios'));
  data.consentimiento = form.get('consentimiento');

  const missing = REQUIRED_FIELDS.filter((k) => !data[k]);
  if (missing.length) {
    return jsonResponse({ error: 'Campos faltantes: ' + missing.join(', ') }, 400);
  }
  if (!DUI_RE.test(data.dui)) return jsonResponse({ error: 'DUI inválido. Formato: 00000000-0.' }, 400);
  if (!PHONE_RE.test(data.telefono)) return jsonResponse({ error: 'Teléfono inválido. Debe tener 8 dígitos.' }, 400);
  if (!EMAIL_RE.test(data.correo)) return jsonResponse({ error: 'Correo inválido.' }, 400);
  if (data.consentimiento !== 'true') return jsonResponse({ error: 'Falta el consentimiento del solicitante.' }, 400);

  const rows = FIELDS.map(({ key, label }) => [label, data[key]]);
  rows.push(['Comentarios', data.comentarios || '(sin comentarios)']);

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

  if (hasFile) {
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
    return jsonResponse({ error: 'Resend rechazó el envío', detail }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}
