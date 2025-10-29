const { createApp } = Vue;

function __genCartaId() {
  try { return crypto.randomUUID(); } catch(_) {}
  return 'carta-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
}

/**
 * Agrega (push) una carta al abono (fila) identificado por tipo/instId/rowUid|rowIdx
 * en el localStorage 'instruccionesData'.
 * Devuelve { ok, tipo, instId, rowIndex, cartaId }
 */
function saveCartaEnInstruccionesMulti({ plantilla, numDigital, asunto, firma1, firma2, extra } = {}) {
  const q = new URLSearchParams(location.search);
  const tipo   = q.get('tipo');
  const instId = q.get('instId');
  const rowUid = q.get('rowUid');
  const rowIdx = Number(q.get('rowIdx') ?? -1);

  if (!tipo || !instId) return { ok: false, reason: 'missing-ids' };

  let bag;
  try { bag = JSON.parse(localStorage.getItem('instruccionesData') || '{}'); }
  catch { bag = {}; }

  const byType = bag?.state?.instructionsByType?.[tipo];
  if (!Array.isArray(byType)) return { ok: false, reason: 'type-not-found' };

  const instIdx = byType.findIndex(x => String(x.id) === String(instId));
  if (instIdx === -1) return { ok: false, reason: 'instruction-not-found' };

  const inst = byType[instIdx];
  const det  = Array.isArray(inst.detalle) ? inst.detalle : [];

  // localizar fila por uid o por índice
  let i = -1;
  if (rowUid) i = det.findIndex(r => String(r?.uid ?? r?.id) === String(rowUid));
  if (i < 0 && rowIdx >= 0 && rowIdx < det.length) i = rowIdx;
  if (i < 0) return { ok: false, reason: 'row-not-found' };

  // preparar nueva carta
  const nuevaCarta = {
    id: __genCartaId(),
    plantilla:  plantilla ?? null,
    numDigital: numDigital ?? null,
    asunto:     asunto ?? null,
    firma1:     firma1 ?? null,
    firma2:     firma2 ?? null,
    fechaISO:   new Date().toISOString(),
    ...(extra || {})          // por si quieres adjuntar más metadata
  };

  // escribir en la fila
  const row = det[i] || {};
  row.hasCarta = true;
  if (!Array.isArray(row.cartas)) row.cartas = [];
  row.cartas.push(nuevaCarta);

  // (opcional) compatibilidad: última carta rápida
  row.carta = { ...nuevaCarta };

  // persistir
  det[i] = row;
  byType[instIdx].detalle = det;
  try { localStorage.setItem('instruccionesData', JSON.stringify(bag)); } catch {}

  return { ok: true, tipo, instId, rowIndex: i, cartaId: nuevaCarta.id };
}


const app = createApp({
  data() {
    return {
      ui: { modalOpen: false },
      selects: {
        texto: 'ORDEN_COMPRA',
        atencion: 'SR. CÉSAR AUGUSTO REÁTEGUI GARCÍA',
        referencia: 'SUBGERENTE DE BANCA INSTITUCIONAL',
        firma1: 'LEON NIETO, PEDRO HUN',
        firma2: 'GARAY SÁNCHEZ, CARLO',
        elaborado: '70429350 - BEDREGAL JULCA, ELIZABETH',
        autorizado1: '70429350 - ALCALÁ BENITES, JORGE',
        autorizado2: '70429350 - ALCALÁ BENITES, JORGE',
        asunto: 'Solicitud de operación de transferencia y apertura',
        proveedor: 'BANCO INTERAMERICANO DE FINANZAS',
      },
      campos: {
        numDigital: '',
        showLogo: true,
      },
      consts: {
        STORAGE_KEY_CARTA: new URLSearchParams(location.search).get('storage_key_carta') || 'oc_operacion_v1',
        PANEL: new URLSearchParams(location.search).get('panel') || '',
        AREA: new URLSearchParams(location.search).get('area') || '',
        OPID: new URLSearchParams(location.search).get('opId')
              || new URLSearchParams(location.search).get('codigoInversion')
              || null,
      },
       opciones: {
      proveedor: [
        'BANCO INTERAMERICANO DE FINANZAS', 'SCOTIABANK', 'BBVA', 'COFIDE'
      ],
      atencion: [
        'SR. CÉSAR AUGUSTO REÁTEGUI GARCÍA', 'SR. JAIME SOTO SALAS'
      ],
      referencia: [
        'SUBGERENTE DE BANCA INSTITUCIONAL', 'Jefe de Custodia y Valores'
      ],
      firma1: [
        'LEON NIETO, PEDRO HUN'
      ],
      firma2: [
        'GARAY SÁNCHEZ, CARLO'
      ],
      elaborado: [
        '70429350 - BEDREGAL JULCA, ELIZABETH'
      ],
      autorizado1: [
        '70429350 - ALCALÁ BENITES, JORGE'
      ],
      autorizado2: [
        '70429350 - ALCALÁ BENITES, JORGE'
      ],
      asunto: [
        'Solicitud de operación de transferencia y apertura'
      ],
      plantilla: [
        { label: 'Orden de compra', value: 'ORDEN_COMPRA' },
        { label: 'Custodio', value: 'CUSTODIO' },
        { label: 'Repo', value: 'TPL_REPO' },
      ],
    },
      
    };
  },

  mounted() {
    // TinyMCE
    this.initEditor('#editorBody', 520, this.bodyInicial(), '14px');
    this.initEditor('#editorFooter', 160, this.footerInicial(), '12px');

    // pinta preview inicial
    setTimeout(this.refreshPreview, 300);
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') this.toggleModal(false); });

      // ...tu init TinyMCE y demás...
this.$nextTick(() => {
  const ensureInitial = (ts, key) => {
    const v = this.selects[key];
    if (!v) return;

    // Para 'texto' (plantilla) usamos label desde opciones.plantilla
    let text = v;
    if (key === 'texto') {
      const found = this.opciones.plantilla.find(o => o.value === v);
      text = found ? found.label : v;
    }

    if (!ts.options[v]) ts.addOption({ value: v, text });
    if (ts.getValue() !== v) ts.setValue(v, true);
  };

  const mk = (id, key, extra = {}) => {
    const ts = new TomSelect(id, {
      create: key === 'texto' ? false : true, // plantilla no crea nuevas
      persist: true,
      allowEmptyOption: true,
      maxOptions: 500,
      sortField: { field: 'text', direction: 'asc' },
      onChange: (val) => { if (key in this.selects) this.selects[key] = val; },
      ...extra,
    });
    ensureInitial(ts, key);
    return ts;
  };

  this._ts = {
    texto:        mk('#selTexto',       'texto'),
    atencion:     mk('#selAtencion',    'atencion'),
    referencia:   mk('#selReferencia',  'referencia'),
    asunto:       mk('#selAsunto',      'asunto'),
    firma1:       mk('#selFirma1',      'firma1'),
    firma2:       mk('#selFirma2',      'firma2'),
    elaborado:    mk('#selElaborado',   'elaborado'),
    autorizado1:  mk('#selAutorizado1', 'autorizado1'),
    autorizado2:  mk('#selAutorizado2', 'autorizado2'),
  };

  // Forzar visualmente la plantilla elegida en 'created()'
  const tsTexto = this._ts?.texto;
  if (tsTexto) {
    const val = this.selects.texto; // viene de created(): tpl || 'ORDEN_COMPRA'
    const opt = this.opciones.plantilla.find(o => o.value === val);
    if (!tsTexto.options[val]) tsTexto.addOption({ value: val, text: opt?.label || val });
    if (tsTexto.getValue() !== val) tsTexto.setValue(val, true);
  }

});



  },
  beforeUnmount() {
  if (this._ts) Object.values(this._ts).forEach(ts => ts?.destroy());
},

  watch: {
    'selects.texto'(val) {
      const nuevo = this.getBodyByTemplate(val);
      const ed = tinymce.get('editorBody');
      if (ed) ed.setContent(nuevo.trim());
      this.refreshPreview();
    },
    // refrescar preview cuando cambien inputs relevantes
    selects: { handler(){ this.refreshPreview(); this.saveState(); }, deep: true },
    campos:   { handler(){ this.refreshPreview(); this.saveState(); }, deep: true },
  },

  created() {
      const st = this.loadState?.();
  if (st) {
    Object.assign(this.selects, st.selects || {});
    Object.assign(this.campos,  st.campos  || {});
  }
  const tpl = new URLSearchParams(location.search).get('tpl');
  this.selects.texto = tpl || 'ORDEN_COMPRA';
  },

  methods: {
    // ==== TinyMCE ====
    initEditor(selector, height, content, size) {
      tinymce.init({
        selector,
        height,
        menubar: false,
        plugins: 'lists table link code fullscreen',
        toolbar: 'undo redo | formatselect | bold italic underline | alignleft aligncenter alignright | ' +
                 'bullist numlist | table link | removeformat | code fullscreen',
        content_style: `body{font-family:Inter,Arial,Helvetica,sans-serif;font-size:${size};color:#0f172a}`,
        setup: ed => {
          ed.on('init', () => { ed.setContent(content); this.refreshPreview(); });
          ed.on('Change KeyUp SetContent Undo Redo', this.debounce(this.refreshPreview, 120));
        }
      });
    },

    bodyInicial() {
      return `
<p>Nos dirigimos a usted en representación del <strong>Fondo Consolidado de Reservas Previsionales – FCR</strong>, 
con RUC N° <strong>20421413216</strong>, a fin de confirmar la orden de compra de los 
<strong>INSTRUMENTOS DE CORTO PLAZO COFIDE</strong> del 4° Programa, 2° Emisión y Serie “C”.</p>

<p>La compra se efectúa bajo las siguientes condiciones:</p>
<br>
<p style="margin-left: 40px; line-height: 1.6;">
  <strong>TITULAR</strong>:&nbsp;&nbsp;&nbsp;&nbsp;FCR–MACROFONDO<br>
  <strong>CAVALI</strong>:&nbsp;&nbsp;&nbsp;&nbsp;942630<br>
  <strong>CANTIDAD BONOS</strong>:&nbsp;&nbsp;&nbsp;&nbsp;2,485.00<br>
  <strong>VALOR NOMINAL UNITARIO</strong>:&nbsp;&nbsp;&nbsp;&nbsp;S/ 5,000.000<br>
  <strong>PRECIO</strong>:&nbsp;&nbsp;&nbsp;&nbsp;100%<br>
  <strong>TASA</strong>:&nbsp;&nbsp;&nbsp;&nbsp;6.0000 % T.N.A.<br>
  <strong>MONTO</strong>:&nbsp;&nbsp;&nbsp;&nbsp;S/ 12,425,000.00
</p>
<br>
<p>Cabe mencionar que hemos dado las instrucciones al <strong>BANCO SCOTIABANK PERÚ</strong> 
para que realice el abono de <strong>S/ 12,425,000.00</strong> a la 
<strong>Cuenta Ordinaria M.N. N° 110301-007101000000000</strong> en el 
<strong>Banco Central de Reserva del Perú</strong>, denominada COFIDE.</p>

<p>Asimismo, sírvase transferir los valores a la cuenta matriz N° 342 del <strong>SCOTIABANK</strong>. 
Para cualquier consulta, contactarse con el Sr. <strong>Jaime Soto Salas</strong>, 
Jefe de Custodia y Valores.</p>

<p>Agradecidos por la atención, quedamos.</p>
<p>Atentamente,</p>
<p><strong>Back Office Tesorería — FCR</strong></p>
      `.trim();
    },

    footerInicial() {
      return `
Número Digital: {{NUM_DIGITAL}} — Elaborado por: {{ELABORADO}} — Back Office Tesorería FCR
<br/>—————————————————————————————————————————————————<br/>
Jr. Bolivia Nº 109 Piso 16º – Centro Cívico y Comercial de Lima – Lima 1. Telf: 634-2222 — Anexo 2917, Fax: 431-7979
      `.trim();
    },

    getBodyByTemplate(val){
      if (val === 'ORDEN_COMPRA') return this.bodyInicial();
      if (val === 'CUSTODIO') {
        return `
<p>Nos dirigimos a usted en representación del <strong>Fondo Consolidado de Reservas Previsionales – FCR</strong>, 
con RUC N° <strong>20421413216</strong>, a fin de solicitar el ingreso de 
<strong>INSTRUMENTOS DE CORTO PLAZO COFIDE</strong> del 4° Programa, 2° Emisión y Serie “C”, 
que se encuentra en su cuenta matriz, a la siguiente cuenta de custodia:</p>
<br>
<p style="margin-left: 40px; line-height: 1.6;">
  <strong>TITULAR</strong>:&nbsp;&nbsp;&nbsp;&nbsp;FCR–MACROFONDO<br>
  <strong>ISIN</strong>:&nbsp;&nbsp;&nbsp;&nbsp;PEPXXXXXXX<br>
  <strong>CAVALI</strong>:&nbsp;&nbsp;&nbsp;&nbsp;942630<br>
  <strong>VALOR NOMINAL UNITARIO</strong>:&nbsp;&nbsp;&nbsp;&nbsp;S/ 5,000.0000<br>
  <strong>TASA</strong>:&nbsp;&nbsp;&nbsp;&nbsp;6.0000 % T.N.A.<br>
  <strong>CANTIDAD BONOS</strong>:&nbsp;&nbsp;&nbsp;&nbsp;2,485.00<br>
  <strong>PRECIO</strong>:&nbsp;&nbsp;&nbsp;&nbsp;100.0000 %<br>
  <strong>MONTO</strong>:&nbsp;&nbsp;&nbsp;&nbsp;S/ 12,425,000.00
</p>
<br>
<p>Cabe mencionar que la compra fue realizada con <strong>COFIDE</strong>.</p>

<p>Sin otro particular, quedamos de ustedes.</p>

<p>Atentamente,</p>
<p><strong>Back Office Tesorería — FCR</strong></p>
        `.trim();
      }
      if (val === 'TPL_REPO') {
        return `
<p>Por la presente, solicitamos realizar una operación de <strong>REPO</strong> conforme a las condiciones previamente acordadas.</p>
<p>Los títulos involucrados y las fechas de recompra se detallan en el anexo correspondiente.</p>
        `.trim();
      }
      return `<p>Nos dirigimos a usted en representación del <strong>Fondo Consolidado de Reservas Previsionales</strong> (FCR).</p>`;
    },

    // ===== Preview =====
    refreshPreview() {
      const node = document.getElementById('preview');
      if (!node) return;
      node.innerHTML = this.buildInner();
    },
    openPreview(){ this.refreshPreview(); this.toggleModal(true); },
    toggleModal(show){ this.ui.modalOpen = !!show; },

    onGenerar() {
      // setear num digital si vacío (opcional)
      if (!this.campos.numDigital) this.campos.numDigital = String(Date.now()).slice(-6);
      this.refreshPreview();
      this.generarPdf().catch(console.error);
    },

    // ===== Helpers =====
    debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a),ms); }; },
    formatearFechaLarga(date) {
      const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const d = date.getDate(); const m = meses[date.getMonth()]; const y = date.getFullYear();
      const mesCap = m.charAt(0).toUpperCase() + m.slice(1);
      return `Lima, ${d} de ${mesCap} de ${y}`;
    },
    parseRepVal(raw) {
      const s = (raw || '').toString().trim();
      const dniMatch = s.match(/\b\d{8,}\b/);
      const dni = dniMatch ? dniMatch[0] : '';
      let nombre = s;
      if (dni) nombre = s.replace(dni, '').replace(/^\s*[-–—]\s*/, '').trim();
      return { nombre, dni };
    },
    normName(s){
      return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
    },
    getSignatureUrlByName(nombre){
      const SIGNATURE_CATALOG = {
        'leon nieto, pedro hun': './img/firma.webp',
        'garay sánchez, carlo':  './img/firma.webp',
        'bedregal julca, elizabeth': './img/evelyn.png',
        'alcala benites, jorge': './img/cruzado.png',
      };
      const DEFAULT_SIGNATURE_URL = './img/firma.webp';
      const k = this.normName(nombre);
      const urls = window.FIRMAS_URLS || {};
      return urls[k] || SIGNATURE_CATALOG[k] || DEFAULT_SIGNATURE_URL;
    },
    escapeHtml(s){ return (s||'').replace(/[&<>"]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); },

    firmaCell(url, nombre, cargo1 = '', cargo2 = '') {
      if (!nombre) return '';
      const src = new URL((url || './img/firma.webp'), window.location.href).href;
      return `
        <div style="display:inline-block; vertical-align:top; width:50%; max-width:50%; 
                    padding:0 10px; box-sizing:border-box; text-align:center; font-size:12px; line-height:1.35;">
          <div style="margin-top:6px; font-weight:600; text-transform:uppercase; min-height:18px;">
            ${this.escapeHtml(nombre)}
          </div>
          <div style="font-size:12px; margin-top:4px; min-height:16px;">
            ${cargo1 ? this.escapeHtml(cargo1) : '&nbsp;'}
          </div>
          <div style="font-size:12px; margin-top:2px; min-height:16px;">
            ${cargo2 ? this.escapeHtml(cargo2) : '&nbsp;'}
          </div>
        </div>
      `;
    },
    firmaCellOperador(url, nombre) {
      if (!nombre) return '';
      return `
        <td style="width:33.33%; text-align:center; padding:0 10px;">
          <div style="font-weight:600; text-transform:uppercase;">${this.escapeHtml(nombre)}</div>
        </td>
      `;
    },

    buildInner() {
      const showLogo   = !!this.campos.showLogo;
      const logoHtml   = showLogo ? `<div style="text-align:left;margin-bottom:0px;">
        <img style="width:150px !important" src="img/logo-fcr.png" alt="Logo"></div>` : '';

      const proveedor  = (this.selects.proveedor || '').toString().trim();
      const bancoLine  = proveedor ? proveedor.toUpperCase() : 'BANCO INTERAMERICANO DE FINANZAS';

      const atencion   = (this.selects.atencion || '').toString().trim();
      const referencia = (this.selects.referencia || '').toString().trim();
      const firma1     = (this.selects.firma1 || '').toString().trim();
      const firma2     = (this.selects.firma2 || '').toString().trim();

      const rep1 = this.parseRepVal(this.selects.autorizado1);
      const rep2 = this.parseRepVal(this.selects.autorizado2);

      let body = tinymce.get('editorBody') ? tinymce.get('editorBody').getContent() : '';
      body = body
        .replace('{{REPRESENTANTE_1}}', rep1.nombre)
        .replace('{{REPRESENTANTE_2}}', rep2.nombre)
        .replace('{{DOC_REPRESENTANTE_1}}', rep1.dni || '')
        .replace('{{DOC_REPRESENTANTE_2}}', rep2.dni || '')
        .replace('{{RUC_FONDO}}', '20421413216');

      const numDigital = this.campos.numDigital || '';
      const elaborado  = (this.selects.elaborado || '').toString().trim();
      const footer = (tinymce.get('editorFooter') ? tinymce.get('editorFooter').getContent() : '')
        .replace('{{NUM_DIGITAL}}', numDigital)
        .replace('{{ELABORADO}}',  elaborado);

      const dir1Nombre = (this.selects.firma1 || '').toString().trim();
      const dir2Nombre = (this.selects.firma2 || '').toString().trim();

      const op1 = this.parseRepVal(this.selects.elaborado);
      const op2 = this.parseRepVal(this.selects.autorizado1);
      const op3 = this.parseRepVal(this.selects.autorizado2);

      const dir1Url = dir1Nombre ? this.getSignatureUrlByName(dir1Nombre) : null;
      const dir2Url = dir2Nombre ? this.getSignatureUrlByName(dir2Nombre) : null;
      const op1Url  = op1.nombre ? this.getSignatureUrlByName(op1.nombre) : null;
      const op2Url  = op2.nombre ? this.getSignatureUrlByName(op2.nombre) : null;
      const op3Url  = op3.nombre ? this.getSignatureUrlByName(op3.nombre) : null;

      const fechaLima = this.formatearFechaLarga(new Date());

      const encabezadoHtml = `
        <div style="page-break-inside:avoid; page-break-after:avoid; margin-bottom:12px">
          <div style="font-weight:700; margin:0">SEÑORES</div>
          <div style="font-weight:700; text-transform:uppercase; margin:2px 0 4px 0">${this.escapeHtml(bancoLine)}</div>
          <div style="margin:0">Ciudad.-</div>
        </div>`;

      const firmasHtml = `
        <br><br>
        <div style="width:100%; font-size:0;">
          ${this.firmaCell(dir1Url, dir1Nombre || firma1,
            'DIRECTOR/A GENERAL DE LA OFICINA DE EJECUTIVA/O DE INVERSIONES FINANCIERAS',
            'Oficina de Normalización Previsional')}
          ${this.firmaCell(dir2Url, dir2Nombre || firma2,
            'ADMINISTRACIÓN',
            'Oficina de Normalización Previsional')}
        </div>

        ${(op1.nombre || op2.nombre || op3.nombre) ? `
        <table style="width:100%; margin-top:14px">
          <tr>
            ${this.firmaCellOperador(op1Url, op1.nombre || '')}
            ${this.firmaCellOperador(op2Url, op2.nombre || '')}
            ${this.firmaCellOperador(op3Url, op3.nombre || '')}
          </tr>
        </table>` : '' }
      `;

      return `
        ${logoHtml}
        <div class="carta" style="font-size:12px; color:#0f172a">
          <div style="margin-bottom:12px">${this.escapeHtml(fechaLima)}</div>
          <div style="margin-bottom:10px">
            <div><strong>Atención:</strong>&nbsp;&nbsp;${this.escapeHtml(atencion)}</div>
            <div style="margin-left:60px">${this.escapeHtml(referencia)}</div>
          </div>
          ${encabezadoHtml}
          ${body}
          <div style="margin-top:24px">Agradecidos por la atención, quedamos</div>
          <div style="margin-top:16px">Atentamente,</div>
          <br><br>
          ${firmasHtml}
          <br><br><br><br>
          <div class="doc-footer" style="margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;color:#475569;font-size:12px">
            ${footer}
          </div>
        </div>
      `;
    },

    async waitImagesLoaded(root) {
      const imgs = Array.from(root.querySelectorAll('img'));
      if (!imgs.length) return;
      await Promise.all(imgs.map(img => new Promise(res => {
        const src = img.getAttribute('src') || '';
        if (src && !/^https?:|^data:/.test(src)) {
          img.setAttribute('src', new URL(src, location.href).href);
        }
        if (img.complete) return res();
        img.addEventListener('load', res, { once: true });
        img.addEventListener('error', res, { once: true });
      })));
    },

    async generarPdf() {
      const host = document.createElement('div');
      host.style.position = 'fixed'; host.style.left = '-99999px'; host.style.top = '0';
      host.innerHTML = `<div class="a4 a4--pdf">${this.buildInner()}</div>`;
      document.body.appendChild(host);

      const id = this.campos.numDigital || 'carta';

      await this.waitImagesLoaded(host);

      await html2pdf()
        .set({
          margin: 0,
          filename: `carta-${id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: false, allowTaint: true, imageTimeout: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] }
        })
        .from(host.firstElementChild)
        .save();


        saveCartaEnInstruccionesMulti({
          plantilla: this.selects?.texto,
          numDigital: this.campos?.numDigital,
          asunto: this.selects?.asunto,
          firma1: this.selects?.firma1,
          firma2: this.selects?.firma2,
          // extra: { cualquierOtroDato: '...' }
        });


      host.remove();

      this.volverALaVista();
    },

    buildFullHTML(){
      return `
        <html><head><meta charset="utf-8" />
          <style>
            .a4{width:210mm;min-height:297mm;padding:20mm;box-sizing:border-box}
            body{font-family:Inter,Arial,Helvetica,sans-serif;color:#0f172a}
            .doc-footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:12px;color:#475569;font-size:12px}
          </style>
        </head>
        <body><div class="a4">${this.buildInner()}</div></body></html>
      `;
    },

    printPreview() {
      const w = window.open('', '_blank');
      w.document.write(this.buildFullHTML());
      w.document.close();
      w.focus();
      w.print();
    },

    // ===== Estado Vue -> localStorage =====
    saveState(){
      const state = {
        selects: this.selects,
        campos:  this.campos,
        meta: {
          updated_at: new Date().toISOString(),
          opId: this.consts.OPID,
          panel: this.consts.PANEL,
          area: this.consts.AREA
        }
      };
      localStorage.setItem(this.consts.STORAGE_KEY_CARTA, JSON.stringify(state));
    },
    loadState(){
      try { return JSON.parse(localStorage.getItem(this.consts.STORAGE_KEY_CARTA) || 'null'); }
      catch { return null; }
    },

    crearCarta(){
      const fechaISO = new Date().toISOString();
      const id = `carta_${Date.now()}_${Math.floor(Math.random()*100000)}`;
      return { id, fechaISO, area: (this.consts.AREA || undefined) };
    },

    volverALaVista() {
  const FALLBACK = 'lista-instrucciones.html';
  const ref = document.referrer;
  let sameOrigin = false;
  try { sameOrigin = ref && new URL(ref).origin === location.origin; } catch {}

  let navigated = false;
  const onPop = () => { navigated = true; };
  window.addEventListener('popstate', onPop, { once: true });

  history.back();

  // Si no navegó, usa referrer same-origin; si no hay, cae al listado
  setTimeout(() => {
    if (!navigated) {
      if (sameOrigin) window.location.replace(ref);
      else window.location.replace(FALLBACK);
    }
  }, 250);
},
      setDefault(key, value) {
    // 1) actualiza el v-model
    this.selects[key] = value;

    // 2) si hay Tom Select, refleja visualmente
    const ts = this._ts?.[key];
    if (!ts) return;

    // resolver etiqueta para 'texto' (plantilla)
    let text = value;
    if (key === 'texto') {
      const found = this.opciones.plantilla.find(o => o.value === value);
      text = found ? found.label : value;
    }

    if (!ts.options[value]) ts.addOption({ value, text });
    if (ts.getValue() !== value) ts.setValue(value, true);
  },

  // opcional: por índice en tu arreglo de opciones
  setDefaultByIndex(key, idx = 0) {
    if (key === 'texto') {
      const opt = this.opciones.plantilla[idx];
      if (opt) this.setDefault('texto', opt.value);
    } else {
      const list = this.opciones[key] || [];
      if (list[idx]) this.setDefault(key, list[idx]);
    }
  },
  


  }
});

// al final:
app.mount('#app');
