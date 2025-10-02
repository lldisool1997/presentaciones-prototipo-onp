document.addEventListener('DOMContentLoaded', () => {
  // ===== Contenidos iniciales =====
  const bodyInicial = `
    <p>Nos dirigimos a usted en representación del <strong>Fondo Consolidado de Reservas Previsionales</strong> (FCR),
    con RUC <strong>{{RUC_FONDO}}</strong>, a fin de solicitarle efectúe la(s) siguiente(s) operación(es):</p>
    <br>
    <p><strong>RECIBIR VÍA BCRP DE:</strong> SCOTIABANK PERÚ SAA / S/ 150,000,000.00</p>

    <p><strong>APERTURA/COMPRA DE:</strong><br/>
       TITULAR: FCR–MACROFONDO<br/>
       INVERSIÓN: DEPÓSITO A PLAZO<br/>
       MONTO: S/ 150,000,000.00 &nbsp;&nbsp;&nbsp;&nbsp; <strong>TASA:</strong> 4.59% T.E.A.<br/>
       PLAZO: 361 días &nbsp;&nbsp;&nbsp;&nbsp; <strong>VENCIMIENTO:</strong> 23/02/2026</p>
      <br>
    <p>Asimismo, autorizamos a {{REPRESENTANTE_1}} (DNI {{DOC_REPRESENTANTE_1}}) y/o
       {{REPRESENTANTE_2}} (DNI {{DOC_REPRESENTANTE_2}}) a recibir la documentación respectiva.</p>

    <p>Agradecidos por la atención, quedamos</p>
    <p>Atentamente,</p>
    <p><strong>Back Office Tesorería — FCR</strong></p>
  `.trim();

  const footerInicial = `
    Número Digital: {{NUM_DIGITAL}} — Elaborado por: {{ELABORADO}} — Back Office Tesorería FCR
    <br/>—————————————————————————————————————————————————<br/>
    Jr. Bolivia Nº 109 Piso 16º – Centro Cívico y Comercial de Lima – Lima 1. Telf: 634-2222 — Anexo 2917, Fax: 431-7979
  `.trim();

  // ===== TinyMCE =====
  initEditor('#editorBody', 520, bodyInicial, '14px');
  initEditor('#editorFooter', 160, footerInicial, '12px');




  function initEditor(selector, height, content, size) {
    tinymce.init({
      selector,
      height,
      menubar: false,
      plugins: 'lists table link code fullscreen',
      toolbar: 'undo redo | formatselect | bold italic underline | ' +
               'alignleft aligncenter alignright | bullist numlist | table link | removeformat | code fullscreen',
      content_style: `body{font-family:Inter,Arial,Helvetica,sans-serif;font-size:${size};color:#0f172a}`,
      setup: ed => {
        ed.on('init', () => { ed.setContent(content); refreshPreview(); });
        ed.on('Change KeyUp SetContent Undo Redo', debounce(refreshPreview, 150));
      }
    });
  }

  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,a),ms); }; }

  // ===== Build doc =====
 // ➜ Reemplaza tu buildInner() por esta versión
function buildInner() {
  const showLogo     = document.getElementById('chkLogo').checked;
  const logoHtml     = showLogo ? `<div style="text-align:left;margin-bottom:0px;">
                                    <img style="width: 150px !important" src="img/logo-fcr.png" alt="Logo">
                                  </div>` : '';

  // Cabecera (leemos lo que ya tienes en los selects2)
  const proveedor  = ($('#txtProveedor').val() || '').toString().trim(); // úsalo como BANCO
  const bancoLine  = proveedor ? proveedor.toUpperCase() : 'BANCO INTERAMERICANO DE FINANZAS';

  const atencion   = ($('#txtAtencion').val()   || 'SR. CÉSAR AUGUSTO REÁTEGUI GARCÍA').toString().trim();
  const referencia = ($('#txtReferencia').val() || 'SUBGERENTE DE BANCA INSTITUCIONAL').toString().trim();
  const firma1     = ($('#txtFirma1').val()     || 'PEDRO LEON NIETO').toString().trim();
  const firma2     = ($('#txtFirma2').val()     || 'CARLOS GARAY SANCHEZ').toString().trim();
  const rep1 = parseRepVal('#txtAutorizado');
  const rep2 = parseRepVal('#txtAutorizado2');

  // Contenidos de editores (cuerpo/pie)
let body = tinymce.get('editorBody') ? tinymce.get('editorBody').getContent() : '';

// Reemplazos en plantilla (si tu body tiene estos marcadores)
body = body
  .replace('{{REPRESENTANTE_1}}', rep1.nombre)
  .replace('{{REPRESENTANTE_2}}', rep2.nombre)
  .replace('{{DOC_REPRESENTANTE_1}}', rep1.dni || '')
  .replace('{{DOC_REPRESENTANTE_2}}', rep2.dni || '')
  .replace('{{RUC_FONDO}}', '20421413216');

  const numDigital = $('#txtNumDigital').val() || '';
  const elaborado  = $('#txtElaborado').val()  || '';
  const footer = (tinymce.get('editorFooter') ? tinymce.get('editorFooter').getContent() : '')
    .replace('{{NUM_DIGITAL}}', numDigital)
    .replace('{{ELABORADO}}',  elaborado);

    // Directivos (selects existentes)
const dir1Nombre = ($('#txtFirma1').val() || '').toString().trim();
const dir2Nombre = ($('#txtFirma2').val() || '').toString().trim();

    // Operadores (usamos lo que YA tienes: Elaborado + Autorizado1 + Autorizado2)
const op1 = parseRepVal('#txtElaborado');   // { nombre, dni } – ya tienes parseRepVal
const op2 = parseRepVal('#txtAutorizado');
const op3 = parseRepVal('#txtAutorizado2');

// URLs de firma (BD→FIRMAS_URLS o catálogo→fallback)
const dir1Url = dir1Nombre ? getSignatureUrlByName(dir1Nombre) : null;
const dir2Url = dir2Nombre ? getSignatureUrlByName(dir2Nombre) : null;
const op1Url  = op1.nombre ? getSignatureUrlByName(op1.nombre) : null;
const op2Url  = op2.nombre ? getSignatureUrlByName(op2.nombre) : null;
const op3Url  = op3.nombre ? getSignatureUrlByName(op3.nombre) : null;

  // Fecha estilo: "Lima, 27 de Febrero de 2025"
  const fechaLima = formatearFechaLarga(new Date());

  // 👇 NUEVO: encabezado sin saltos
const encabezadoHtml = `
  <div style="page-break-inside:avoid; page-break-after:avoid; margin-bottom:12px">
    <div style="font-weight:700; margin:0">SEÑORES</div>
    <div style="font-weight:700; text-transform:uppercase; margin:2px 0 4px 0">${escapeHtml(bancoLine)}</div>
    <div style="margin:0">Ciudad.-</div>
  </div>
`;

  // Bloque firmas (como en la imagen)
const firmasHtml = `
  <br><br>

   <div style="width:100%; font-size:0;">
    ${firmaCell(dir1Url, dir1Nombre || firma1,
      'DIRECTOR/A GENERAL DE LA OFICINA DE EJECUTIVA/O DE INVERSIONES FINANCIERAS',
      'Oficina de Normalización Previsional',
      '50%')}
    ${firmaCell(dir2Url, dir2Nombre || firma2,
      'ADMINISTRACIÓN',
      'Oficina de Normalización Previsional',
      '50%')}
  </div>

  <!-- Operadores (3 columnas, solo nombre + firma) -->
  ${(op1.nombre || op2.nombre || op3.nombre) ? `
  <table style="width:100%; margin-top:14px">
    <tr>
      ${firmaCellOperador(op1Url, op1.nombre || '')}
      ${firmaCellOperador(op2Url, op2.nombre || '')}
      ${firmaCellOperador(op3Url, op3.nombre || '')}
    </tr>
  </table>
  ` : ''}
`;



  // Render final (replica el orden del pantallazo)
  return `
    ${logoHtml}
    <div class="carta" style="font-size:12px; color:#0f172a">
      <div style="margin-bottom:12px">${escapeHtml(fechaLima)}</div>

      ${encabezadoHtml}

      <div style="margin-bottom:10px">
        <div><strong>Atención:</strong>&nbsp;&nbsp;${escapeHtml(atencion)}</div>
        <div style="margin-left:60px">${escapeHtml(referencia)}</div>
      </div>
       ${body}

      
      <div style="margin-top:24px">Agradecidos por la atención, quedamos</div>
      <div style="margin-top:16px">Atentamente,</div>

      <br>
      <br>
      ${firmasHtml}
      <br>
      <br>
      <br>
      <br>
      
      <div class="doc-footer" style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;color:#475569;font-size:12px">
        ${footer}
      </div>
    </div>
  `;
}

// ➜ Pega este helper debajo (o arriba) del buildInner:
function formatearFechaLarga(date) {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const d = date.getDate();
  const m = meses[date.getMonth()];
  const y = date.getFullYear();
  // Capitaliza el mes como en el pantallazo (Primera letra en mayúscula)
  const mesCap = m.charAt(0).toUpperCase() + m.slice(1);
  return `Lima, ${d} de ${mesCap} de ${y}`;
}

function parseRepVal(sel) {
  const raw = ($(sel).val() || '').toString().trim();   // ej: "70429350 - ALCALÁ BENITES, JORGE"
  const dniMatch = raw.match(/\b\d{8,}\b/);             // primer bloque de 8+ dígitos
  const dni = dniMatch ? dniMatch[0] : '';
  let nombre = raw;

  if (dni) {
    // quita el DNI y separadores iniciales " - ", " – ", " — "
    nombre = raw.replace(dni, '').replace(/^\s*[-–—]\s*/, '').trim();
  }
  return { nombre, dni };
}


  // ===== Preview modal =====
  function refreshPreview(){ document.getElementById('preview').innerHTML = buildInner(); }
  function openPreview(){ refreshPreview(); toggleModal(true); }
  function toggleModal(show){
    const modal = document.getElementById('previewModal');
    if(show){ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
    else    { modal.classList.add('hidden');    modal.setAttribute('aria-hidden','true');  }
  }

  // Botones
  $('#btnAplicar').on('click', refreshPreview);
  $('#btnPreview').on('click', openPreview);
  $('#btnGenerar').on('click', () => { refreshPreview(); generarCarta(); toast('Carta generada (demo).'); });

  function generarCarta(){
        $('#txtNumDigital').val("615004");
    generarPdf();
  }

  $('#btnWord').on('click', () => {
    const html = buildFullHTML();
    const blob = window.htmlDocx.asBlob(html);
    window.saveAs(blob, 'carta.docx');
  });

// Util: esperar a que carguen las imágenes dentro de un nodo
function waitImagesLoaded(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  if (!imgs.length) return Promise.resolve();
  return Promise.all(imgs.map(img => new Promise(res => {
    // normaliza src relativo a absoluto (mismo origen)
    const src = img.getAttribute('src') || '';
    if (src && !/^https?:|^data:/.test(src)) {
      img.setAttribute('src', new URL(src, location.href).href);
    }
    if (img.complete) return res();
    img.addEventListener('load', res, { once: true });
    img.addEventListener('error', res, { once: true });
  })));
}

async function generarPdf() {
  try {
    // 1) crea contenedor oculto en el DOM
    const host = document.createElement('div');
    host.style.position = 'fixed';
    host.style.left = '-99999px';
    host.style.top = '0';
    host.innerHTML = `<div class="a4 a4--pdf">${buildInner()}</div>`;
    document.body.appendChild(host);

    const id = $('#txtNumDigital').val(); // opcional, para nombrar el archivo

    // 2) espera imágenes
    await waitImagesLoaded(host);


    // 3) genera y fuerza descarga
    await html2pdf()
      .set({
        margin: 0,
        filename: 'carta.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: false, allowTaint: true, imageTimeout: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      })
      .from(host.firstElementChild)
      .toPdf()
      .get('pdf')
      .then(pdf => pdf.save('carta-' + id + '.pdf'));

    // 4) limpia
    host.remove();

    // 5) Marca en localStorage y vuelve al back-office
    marcarCartaGenerada();   // <<< setea carta_generada: true según scope/id
    volverALaVista();        // <<< regresar

  } catch (err) {
    console.error('Error generando PDF:', err);
  }
}



  // Modal close handlers
  $('#btnCloseModal, #btnCloseModal2, #modalBackdrop').on('click', () => toggleModal(false));
  document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') toggleModal(false); });

  function buildFullHTML(){
    return `
      <html><head><meta charset="utf-8" />
        <style>
          .a4{width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box}
          body{font-family:Inter,Arial,Helvetica,sans-serif;color:#0f172a}
          .doc-footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;color:#475569;font-size:12px}
        </style>
      </head>
      <body><div class="a4">${buildInner()}</div></body></html>
    `;
  }

  function toast(msg){
    const t = $(`<div class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg z-50">${msg}</div>`);
    $('body').append(t); setTimeout(()=>t.fadeOut(200,()=>t.remove()),1400);
  }

  // Pre-render
  setTimeout(refreshPreview, 400);

  // Imprimir desde el modal
  $('#btnPrint').on('click', () => {
    const w = window.open('', '_blank');
    w.document.write(buildFullHTML());
    w.document.close();
    w.focus();
    w.print();
  });

  // Activa Select2 en TODOS los <select>
$('select').select2({
  width: '100%',
  placeholder: "Seleccione...",
  allowClear: true
});

});


   function getAreaParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("area");
  }

  const area = getAreaParam();
  if (area) {
    document.getElementById("area-badge").textContent = "Perfil: " + area;
  }

  // ===== Firmas por nombre (puedes reemplazar por las URL reales de tu BD)
const SIGNATURE_CATALOG = {
  'leon nieto, pedro hun': './img/firma.webp',
  'garay sánchez, carlo':  './img/firma.webp',
  'bedregal julca, elizabeth': './img/evelyn.png',
  'alcala benites, jorge': './img/cruzado.png',
  // agrega los que uses
};
window.FIRMAS_URLS = SIGNATURE_CATALOG || {}; // <- si tu backend inyecta { 'nombre': 'https://...' }

const DEFAULT_SIGNATURE_URL = './img/firma.webp';

function normName(s){
  return (s||'')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quita tildes
    .replace(/\s+/g,' ')
    .trim();
}
function getSignatureUrlByName(nombre){
  const k = normName(nombre);
  return window.FIRMAS_URLS[k] || SIGNATURE_CATALOG[k] || DEFAULT_SIGNATURE_URL;
}

// Celda de firma reutilizable con espacios consistentes
function firmaCell(url, nombre, cargo1 = '', cargo2 = '') {
  if (!nombre) return '';

  // usa la local si no te pasan url; y normaliza a absoluta para el PDF
  const src = new URL((url || DEFAULT_SIGNATURE_URL), window.location.href).href;

  return `
    <div style="display:inline-block; vertical-align:top; width:50%; max-width:50%; 
                padding:0 10px; box-sizing:border-box; text-align:center; font-size:12px; line-height:1.35;">

      <div style="margin-top:6px; font-weight:600; text-transform:uppercase; min-height:18px;">
        ${escapeHtml(nombre)}
      </div>
      <div style="font-size:12px; margin-top:4px; min-height:16px;">
        ${cargo1 ? escapeHtml(cargo1) : '&nbsp;'}
      </div>
      <div style="font-size:12px; margin-top:2px; min-height:16px;">
        ${cargo2 ? escapeHtml(cargo2) : '&nbsp;'}
      </div>
    </div>
  `;
}

function firmaCellOperador(url, nombre, cargo1 = '', cargo2 = '') {
  if (!nombre) return '';

  // si no viene url, usa la firma local por defecto
  const src = new URL((url || './img/firma.webp'), window.location.href).href;

  return `
    <div style="
      display:inline-block;
      vertical-align:top;
      width:33.33%;
      max-width:33.33%;
      padding:0 10px;
      box-sizing:border-box;
      text-align:center;
    ">
    </div>
  `;
}
// ========= CARTA: helpers de navegación y storage =========
// ===== Carta: setear flag y volver =====
const STORAGE_KEY_CARTA = 'oc_operacion_v1';
const RETURN_FALLBACK   = 'back-office-ope-camb.html'; // cámbialo si tu back-office tiene otra ruta

function qsGet(k){ return new URLSearchParams(location.search).get(k); }


function qsGet(k){ return new URLSearchParams(location.search).get(k); }

function marcarCartaGenerada(){
  const scope = qsGet('scope');        // 'operacion' | 'transferencia'
  const tabId = qsGet('id');           // 'tab-operacion' | 'tab-trf-1' | ...
  if (!scope || !tabId) return;

  const data = JSON.parse(localStorage.getItem(STORAGE_KEY_CARTA) || '{}');
  const nowISO = new Date().toISOString();

  if (scope === 'operacion') {
    data.operacion = data.operacion || {};
    data.operacion.carta_generada = true;
    data.operacion.carta_fecha    = nowISO;   // << guarda fecha
  } else if (scope === 'transferencia') {
    let idx = -1;
    const m = /tab-trf-(\d+)/.exec(tabId);
    if (m) idx = parseInt(m[1], 10) - 1;
    if ((idx < 0 || !data.transferencias?.[idx]) && Array.isArray(data.transferencias)) {
      idx = data.transferencias.findIndex(t => t?.id === tabId); // fallback por id
    }
    if (idx >= 0) {
      data.transferencias[idx] = data.transferencias[idx] || {};
      data.transferencias[idx].carta_generada = true;
      data.transferencias[idx].carta_fecha    = nowISO; // << guarda fecha
    }
  }

  data.meta = { ...(data.meta||{}), cartaUpdatedAt: nowISO };
  localStorage.setItem(STORAGE_KEY_CARTA, JSON.stringify(data));
}


function volverALaVista(){
  const ret = qsGet('return');
  if (ret) { window.location.href = ret; return; }
  if (document.referrer) {
    try {
      const sameOrigin = new URL(document.referrer).origin === location.origin;
      if (sameOrigin && history.length > 1) { history.back(); return; }
    } catch {}
  }
  window.location.href = RETURN_FALLBACK;
}


function volverALaVista(){
  const ret = qsGet('return');
  if (ret) { window.location.href = ret; return; }
  if (document.referrer) {
    try {
      const sameOrigin = new URL(document.referrer).origin === location.origin;
      if (sameOrigin && history.length > 1) { history.back(); return; }
    } catch(e){}
  }
  window.location.href = RETURN_FALLBACK;
}

  
function escapeHtml(s){ return (s||'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }
