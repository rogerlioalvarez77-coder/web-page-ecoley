// Cloudflare Pages Function — recibe el formulario de solicitud y envía un
// correo con los datos usando la API de Resend.
//
// El formulario es adaptativo: los campos que llegan dependen del servicio
// elegido (jurídico, préstamo —con cuatro líneas— o recuperación de cartera).
// Por eso la validación no es una lista fija, sino que se arma según el
// servicio; ver camposRequeridos(). Debe mantenerse en sintonía con la misma
// función en index.html.
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

const MAX_FILE_BYTES = 10 * 1024 * 1024;  // por archivo — debe coincidir con index.html (onFile)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024; // suma de adjuntos: en base64 crecen ~33% y Resend
                                          // limita el tamaño total del correo.

const SERVICIOS = ['Servicios Jurídicos', 'Intermediación de Préstamos', 'Gestión y Recuperación de Cartera'];
const TIPOS_PRESTAMO = ['Préstamo Personal', 'Préstamo Prendario', 'Préstamo Hipotecario', 'PrestaGob'];

// Etiquetas para el correo. El orden define el orden de las filas.
const LABELS = {
  servicioInteresado: 'Servicio de interés',
  tipoPrestamo: 'Tipo de préstamo',
  nombre: 'Nombre',
  dui: 'DUI',
  telefono: 'Teléfono',
  correo: 'Correo',
  areaJuridica: 'Área de asesoría',
  descripcionCaso: 'Caso a consultar',
  prestagobModalidad: 'Servicio de interés (PrestaGob)',
  fuenteIngreso: 'Fuente de ingreso',
  lugarTrabajo: 'Lugar de trabajo',
  sueldo: 'Sueldo o ingresos',
  direccion: 'Dirección',
  montoSolicitar: 'Monto a solicitar',
  plazoSolicitar: 'Plazo (meses)',
  tipoPrenda: 'Tipo de prenda',
  anioPrenda: 'Año de la prenda',
  marca: 'Marca',
  modelo: 'Modelo',
  placa: 'Placa',
  estadoPrenda: 'Estado de la prenda',
  tipoInmueble: 'Tipo de inmueble',
  ubicacionInmueble: 'Ubicación del inmueble',
  embargo: '¿Tiene embargo?',
  montoDeuda: 'Monto de la deuda',
  empresaDeuda: 'Empresa donde tiene la deuda',
  comentarios: 'Comentarios'
};
const CAMPOS = Object.keys(LABELS);

// Claves de archivo aceptadas (deben coincidir con adjuntosPorServicio en index.html)
const ADJUNTOS = {
  comprobanteIngreso: 'Comprobante de ingreso',
  comprobanteIngresoGob: 'Constancia de sueldo o boleta de pago',
  reciboServicios: 'Recibo de agua o luz',
  duiFoto: 'DUI (fotografía)',
  fotoPrenda: 'Fotografía de la prenda',
  tarjetaCirculacion: 'Tarjeta de circulación',
  fotoPropiedad: 'Fotografía de la propiedad',
  documentosPersonales: 'Documentos personales',
  documentos: 'Documentos adjuntos'
};

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

// Los campos de texto largo conservan los saltos (se escapan al render).
function cleanMultiline(value) {
  return String(value ?? '').trim();
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

// Qué campos son obligatorios según el servicio elegido. Espejo de
// camposRequeridos() en index.html: si cambias uno, cambia el otro.
function camposRequeridos(d) {
  const req = ['nombre', 'telefono', 'correo'];
  if (d.servicioInteresado === 'Servicios Jurídicos') {
    req.push('dui', 'areaJuridica');
  } else if (d.servicioInteresado === 'Gestión y Recuperación de Cartera') {
    req.push('montoDeuda', 'empresaDeuda');
  } else if (d.servicioInteresado === 'Intermediación de Préstamos') {
    req.push('dui', 'tipoPrestamo', 'lugarTrabajo', 'sueldo', 'direccion', 'montoSolicitar', 'plazoSolicitar');
    if (d.tipoPrestamo === 'PrestaGob') req.push('prestagobModalidad', 'embargo');
    else req.push('fuenteIngreso');
    if (d.tipoPrestamo === 'Préstamo Prendario') req.push('tipoPrenda', 'anioPrenda', 'marca', 'modelo', 'placa', 'estadoPrenda');
    if (d.tipoPrestamo === 'Préstamo Hipotecario') req.push('tipoInmueble', 'ubicacionInmueble');
  }
  return req;
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

  // Honeypot: campo oculto (ver index.html) que un usuario real nunca
  // llena. Si viene lleno, es un bot — respondemos "ok" sin enviar el correo
  // para no delatar el filtro.
  if (cleanField(form.get('honeypot'))) {
    return jsonResponse({ ok: true }, 200);
  }

  const data = {};
  for (const key of CAMPOS) {
    data[key] = (key === 'comentarios' || key === 'descripcionCaso')
      ? cleanMultiline(form.get(key))
      : cleanField(form.get(key));
  }
  data.consentimiento = form.get('consentimiento');

  // ---- validación ----
  if (!SERVICIOS.includes(data.servicioInteresado)) {
    return jsonResponse({ error: 'Servicio de interés inválido.' }, 400);
  }
  if (data.servicioInteresado === 'Intermediación de Préstamos' && !TIPOS_PRESTAMO.includes(data.tipoPrestamo)) {
    return jsonResponse({ error: 'Tipo de préstamo inválido.' }, 400);
  }

  const requeridos = camposRequeridos(data);
  const missing = requeridos.filter((k) => !data[k]);
  if (missing.length) {
    return jsonResponse({ error: 'Campos faltantes: ' + missing.map((k) => LABELS[k] || k).join(', ') }, 400);
  }
  if (requeridos.includes('dui') && !DUI_RE.test(data.dui)) {
    return jsonResponse({ error: 'DUI inválido. Formato: 00000000-0.' }, 400);
  }
  if (!PHONE_RE.test(data.telefono)) return jsonResponse({ error: 'Teléfono inválido. Debe tener 8 dígitos.' }, 400);
  if (!EMAIL_RE.test(data.correo)) return jsonResponse({ error: 'Correo inválido.' }, 400);
  for (const k of ['sueldo', 'montoSolicitar', 'montoDeuda', 'plazoSolicitar']) {
    if (requeridos.includes(k) && !(Number(data[k]) > 0)) {
      return jsonResponse({ error: `Valor inválido en "${LABELS[k]}".` }, 400);
    }
  }
  if (data.consentimiento !== 'true') return jsonResponse({ error: 'Falta el consentimiento del solicitante.' }, 400);

  // ---- adjuntos ----
  const attachments = [];
  let totalBytes = 0;
  for (const key of Object.keys(ADJUNTOS)) {
    const file = form.get(key);
    if (!file || typeof file !== 'object' || !('arrayBuffer' in file) || file.size === 0) continue;
    if (file.size > MAX_FILE_BYTES) {
      return jsonResponse({ error: `"${ADJUNTOS[key]}" supera el máximo por archivo (10 MB).` }, 413);
    }
    totalBytes += file.size;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return jsonResponse({ error: 'Los adjuntos superan en conjunto el máximo permitido (20 MB).' }, 413);
    }
    // Prefijo con la clave para que en el correo se sepa qué es cada archivo.
    const nombre = file.name || 'adjunto';
    attachments.push({ filename: `${key}-${nombre}`, content: await fileToBase64(file) });
  }

  // ---- correo ----
  const rows = CAMPOS
    .filter((k) => data[k])
    .map((k) => [LABELS[k], data[k]]);
  rows.push([
    'Adjuntos',
    attachments.length
      ? Object.keys(ADJUNTOS).filter((k) => form.get(k) && form.get(k).size > 0).map((k) => ADJUNTOS[k]).join(', ')
      : '(sin adjuntos)'
  ]);

  const html = `
    <h2>Nueva solicitud — Ecoley</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      ${rows.map(([label, value]) => `
        <tr>
          <td style="font-weight:600;vertical-align:top">${escapeHtml(label)}</td>
          <td style="white-space:pre-wrap">${escapeHtml(value)}</td>
        </tr>`).join('')}
    </table>
  `;

  const detalle = data.tipoPrestamo || data.areaJuridica || data.servicioInteresado;
  const payload = {
    from: env.FROM_EMAIL || 'onboarding@resend.dev',
    to: [env.TO_EMAIL || 'atencionalcliente@ecoleysv.com'],
    reply_to: data.correo,
    subject: `Nueva solicitud de ${data.nombre} — ${detalle}`,
    html
  };

  if (attachments.length) payload.attachments = attachments;

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
    console.error('[enviar-solicitud] Resend rechazó el envío:', resendRes.status, detail);
    return jsonResponse({ error: 'Resend rechazó el envío', detail }, 502);
  }

  return jsonResponse({ ok: true }, 200);
}
