document.addEventListener('DOMContentLoaded', () => {
  // ===== Contenidos iniciales =====
  const bodyInicial = `
    <p>Nos dirigimos a usted en representación del <strong>Fondo Consolidado de Reservas Previsionales</strong> (FCR),
    con RUC <strong>{{RUC_FONDO}}</strong>, a fin de solicitarle efectúe la(s) siguiente(s) operación(es):</p>

    <p><strong>RECIBIR VÍA BCRP DE:</strong> SCOTIABANK PERÚ SAA / S/ 150,000,000.00</p>

    <p><strong>APERTURA/COMPRA DE:</strong><br/>
       TITULAR: FCR–MACROFONDO<br/>
       INSTRUMENTO: DEPÓSITO A PLAZO<br/>
       MONTO: S/ 150,000,000.00 &nbsp;&nbsp;&nbsp;&nbsp; <strong>TASA:</strong> 4.59% T.E.A.<br/>
       PLAZO: 361 días &nbsp;&nbsp;&nbsp;&nbsp; <strong>VENCIMIENTO:</strong> 23/02/2026</p>

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
  function buildInner() {
    const showLogo     = document.getElementById('chkLogo').checked;
    const logoHtml     = showLogo ? `<div style="text-align:right;margin-bottom:12px">
                                      <img src="https://dummyimage.com/140x40/4f46e5/ffffff&text=LOGO" alt="Logo">
                                    </div>` : '';

    const atencion   = $('#txtAtencion').val() || '';
    const referencia = $('#txtReferencia').val() || '';
    const asunto     = $('#txtAsunto').val() || '';
    const firma1     = $('#txtFirma1').val() || '';
    const firma2     = $('#txtFirma2').val() || '';
    const elaborado  = $('#txtElaborado').val() || '';
    const autorizado = $('#txtAutorizado').val() || '';
    const proveedor  = $('#txtProveedor').val() || '';
    const numDigital = $('#txtNumDigital').val() || '';

    const body   = tinymce.get('editorBody') ? tinymce.get('editorBody').getContent() : '';
    const footer = (tinymce.get('editorFooter') ? tinymce.get('editorFooter').getContent() : '')
      .replace('{{NUM_DIGITAL}}', numDigital)
      .replace('{{ELABORADO}}',  elaborado);

    return `
      ${logoHtml}
      <div style="font-size:12px;color:#334155;margin-bottom:10px">
        <div><strong>Atención:</strong> ${escapeHtml(atencion)}</div>
        <div><strong>Carta referencia:</strong> ${escapeHtml(referencia)}</div>
        <div><strong>Asunto:</strong> ${escapeHtml(asunto)}</div>
        <div><strong>Firmas:</strong> ${escapeHtml(firma1)} &nbsp;/&nbsp; ${escapeHtml(firma2)}</div>
        <div><strong>Elaborado:</strong> ${escapeHtml(elaborado)} &nbsp;&nbsp; <strong>Autorizado:</strong> ${escapeHtml(autorizado)}</div>
        ${proveedor ? `<div><strong>Proveedor:</strong> ${escapeHtml(proveedor)}</div>` : ''}
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:12px 0" />
      ${body}
      <div class="doc-footer">${footer}</div>
    `;
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
  $('#btnGenerar').on('click', () => { refreshPreview(); toast('Carta generada (demo).'); });

  $('#btnWord').on('click', () => {
    const html = buildFullHTML();
    const blob = window.htmlDocx.asBlob(html);
    window.saveAs(blob, 'carta.docx');
  });

  $('#btnPDF').on('click', () => {
    const container = document.createElement('div');
    container.innerHTML = `<div class="a4">${buildInner()}</div>`;
    html2pdf().from(container).set({
      margin: 10,
      filename: 'carta.pdf',
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
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