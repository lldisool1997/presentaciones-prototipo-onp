document.addEventListener('DOMContentLoaded', () => {
  // ===== Contenidos iniciales =====
  const bodyInicial = `
    <p>Nos dirigimos a usted en representación del <strong>Fondo Consolidado de Reservas Previsionales</strong> (FCR),
    con RUC <strong>{{RUC_FONDO}}</strong>, a fin de solicitarle efectúe la(s) siguiente(s) operación(es):</p>
    <br>
    <p><strong>RECIBIR VÍA BCRP DE:</strong> SCOTIABANK PERÚ SAA / S/ 150,000,000.00</p>

    <p><strong>APERTURA/COMPRA DE:</strong><br/>
       TITULAR: FCR–MACROFONDO<br/>
       INSTRUMENTO: DEPÓSITO A PLAZO<br/>
       MONTO: S/ 150,000,000.00 &nbsp;&nbsp;&nbsp;&nbsp; <strong>TASA:</strong> 4.59% T.E.A.<br/>
       PLAZO: 361 días &nbsp;&nbsp;&nbsp;&nbsp; <strong>VENCIMIENTO:</strong> 23/02/2026</p>
      <br>
    <p>Asimismo, autorizamos a {{REPRESENTANTE_1}} (DNI {{DOC_REPRESENTANTE_1}}) y/o
       {{REPRESENTANTE_2}} (DNI {{DOC_REPRESENTANTE_2}}) a recibir la documentación respectiva.</p>

    <p>Agradecidos por la atención, quedamos</p>
    <p>Atentamente,</p><br/><br/>
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
  const logoHtml     = showLogo ? `<div style="text-align:right;margin-bottom:12px" class="w-[150px]">
                                    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFvOeuVDPtFPk5JOW4qE0ViixY48jx65AN6A&s" alt="Logo">
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

  // Fecha estilo: "Lima, 27 de Febrero de 2025"
  const fechaLima = formatearFechaLarga(new Date());

  // Bloque firmas (como en la imagen)
  const firmasHtml = `
    <br><br>
    <table style="width:100%; margin-top:20px">
      <tr>
        <td style="width:50%; text-align:center; vertical-align:top; padding-right:10px">
          <div style="margin-top:28px; font-weight:600; text-transform:uppercase">${escapeHtml(firma1)}</div>
          <div style="font-size:12px; margin-top:4px">DIRECTOR/A GENERAL DE LA OFICINA DE EJECUTIVA/O DE INVERSIONES FINANCIERAS</div>
          <div style="font-size:12px; margin-top:2px">Oficina de Normalización Previsional</div>
        </td>
        <td style="width:50%; text-align:center; vertical-align:top; padding-left:10px">
          <div style="margin-top:28px; font-weight:600; text-transform:uppercase">${escapeHtml(firma2)}</div>
          <div style="font-size:12px; margin-top:4px">ADMINISTRACIÓN</div>
          <div style="font-size:12px; margin-top:2px">Oficina de Normalización Previsional</div>
        </td>
      </tr>
    </table>
  `;

  // Render final (replica el orden del pantallazo)
  return `
    ${logoHtml}
    <div class="carta" style="font-size:12px; color:#0f172a">
      <div style="margin-bottom:12px">${escapeHtml(fechaLima)}</div>

      <div style="font-weight:700; margin-bottom:4px">SEÑORES</div>
      <div style="font-weight:700; text-transform:uppercase">${escapeHtml(bancoLine)}</div>
      <div style="margin:6px 0 16px 0">Ciudad.-</div>

      <div style="margin-bottom:10px">
        <div><strong>Atención:</strong>&nbsp;&nbsp;${escapeHtml(atencion)}</div>
        <div style="margin-left:60px">${escapeHtml(referencia)}</div>
      </div>
       ${body}

      
      <div style="margin-top:24px">Agradecidos por la atención, quedamos</div>
      <div style="margin-top:16px">Atentamente,</div>

      ${firmasHtml}

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


function escapeHtml(s){ return (s||'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }


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
  }

  $('#btnWord').on('click', () => {
    const html = buildFullHTML();
    const blob = window.htmlDocx.asBlob(html);
    window.saveAs(blob, 'carta.docx');
  });

$('#btnPDF').on('click', () => {
  const container = document.createElement('div');
  container.innerHTML = `<div class="a4 a4--pdf">${buildInner()}</div>`;

  html2pdf().from(container).set({
    margin: 0,                                    // sin margen extra del PDF
    filename: 'carta.pdf',
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css'] }     // intenta no partir
  }).save();
});


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
});


   function getAreaParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("area");
  }

  const area = getAreaParam();
  if (area) {
    document.getElementById("area-badge").textContent = "Perfil: " + area;
  }