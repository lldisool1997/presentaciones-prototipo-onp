/* =====================  CONFIG  ===================== */
const STORAGE_KEY = 'oc_operacion_v1';
const STORAGE_VERSION = '1';

/* =====================  MOCK DATA  ===================== */
const BANCOS = [
  { id: 'BCP',    text: 'Banco de Crédito del Perú (BCP)' },
  { id: 'SCOTIA', text: 'SCOTIABANK' },
  { id: 'BBVA',   text: 'BBVA' },
  { id: 'INTER',  text: 'INTERBANK' },
];
const CUENTAS = {
  BCP:    ['193-1990153-0-54', '193-8645423-52'],
  SCOTIA: ['012-9876543-00', '012-5555555-90'],
  BBVA:   ['0011-123456-00-01'],
  INTER:  ['777-000111-22']
};
const DEFAULT_DOCS = ['Documento sustentatorio'];

/* =====================  HELPERS UI  ===================== */

// ====== ESTADO + CHECK EN TABS ======
const ESTADOS_OK = new Set(['confirmado','registrado','enviado','aprobado']);

function setEstado(scope, tabId, nuevoEstado){
  const data = loadFromStorage() || {};
  if (scope === 'operacion') {
    data.operacion = data.operacion || {};
    data.operacion.estado = nuevoEstado;
  } else if (scope === 'transferencia') {
    const m = /tab-trf-(\d+)/.exec(tabId);
    const idx = m ? (parseInt(m[1],10) - 1) : -1;
    if (idx >= 0) {
      data.transferencias = Array.isArray(data.transferencias) ? data.transferencias : [];
      data.transferencias[idx] = data.transferencias[idx] || {};
      data.transferencias[idx].estado = nuevoEstado;
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyEstadoBadges(data);
  return data;
}


function applyEstadoBadges(data){
  // limpia checks
  $('.oc-tab').removeClass('is-done').find('.oc-tab-check').remove();
  // resetea visibilidad de botones (por si vuelves de un estado no-final)
  $('#btnInstruir').removeClass('hidden');
  $('#transfer-panels .oc-panel .trf-btn-confirmar').removeClass('hidden');

  // Operación
  if (data?.operacion?.estado && ESTADOS_OK.has(data.operacion.estado)) {
    addCheck($('#tabbtn-operacion'));
    // ocultar botón Confirmar de Operación
    $('#btnGenerarCarta').addClass('hidden');
    $('#btnInstruir').addClass('hidden');
    $('#oc_btn_add_doc').addClass('hidden');
    $('input, select').prop("disabled", true)
    $('.inp-fecha').prop("disabled", false)
  }

  // Transferencias
  $('.oc-tab[data-kind="trf"]').each(function(){
    const $tabBtn = $(this);
    const panelId = $tabBtn.data('tab');            // ej: 'tab-trf-2'
    const m = /tab-trf-(\d+)/.exec(panelId);
    const idx = m ? (parseInt(m[1],10) - 1) : -1;

    if (idx >= 0 && data?.transferencias?.[idx]?.estado && ESTADOS_OK.has(data.transferencias[idx].estado)) {
      addCheck($tabBtn);
      // ocultar botón Confirmar de esa transferencia
      const $panel = $('#'+panelId);
      $panel.find('.trf-btn-confirmar').addClass('hidden');
      $panel.find('.trf-btn-carta').addClass('hidden');
      $panel.find('.trf-btn-add-doc').addClass('hidden');
            $panel.find('input, select').prop("disabled", true)
                $panel.find('.inp-fecha').prop("disabled", false)
    }
  });

  function addCheck($btn){
    $btn.addClass('is-done');
    if (!$btn.find('.oc-tab-check').length){
      $btn.append('');
    }
  }
}



// ====== Última carta generada (helpers) ======
function formatFechaLima(iso){
  if (!iso) return '--/--/---- --:--';
  try {
    return new Date(iso).toLocaleString('es-PE', {
      timeZone: 'America/Lima', hour12: false,
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit'
    });
  } catch { return '--/--/---- --:--'; }
}

/**
 * Inserta (si no existe) o actualiza el bloque “Última carta generada”
 * bajo la subsección de Sustento del scope dado.
 * @param {$} $anchorSubsection - la .subsection que contiene los sustentos
 * @param {string} isoTs - fecha ISO
 * @param {string} suffix - sufijo único (ej: 'operacion' o el id del panel)
 */
function renderUltimaCarta($anchorSubsection, isoTs, suffix){
  const secId  = `ultima-carta-${suffix}`;
  const spanId = `fechaCarta-${suffix}`;

  if (!$anchorSubsection.find(`#${secId}`).length){
    $anchorSubsection.append(`
      <section id="${secId}" class="mt-6 p-4 border rounded-lg bg-white shadow w-[500px]">
        <div class="flex items-start justify-between gap-4">
        <div>
         <h2 class="text-lg font-semibold text-gray-800 mb-2">📄 Última carta generada</h2>
        <p class="text-sm text-gray-600">
          Fecha y hora:
          <span id="${spanId}" class="font-medium text-gray-900">--/--/---- --:--</span>
        </p>
         <!-- Botones pequeños -->
        </div>
          
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-700 text-white"
        data-action="confirmar"
      >
        Subir Carta Firmada
      </button>
    </div>
        <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
        data-action="confirmar"
      >
        Confirmar
      </button>
    </div>
        </div>
     
      </section>
    `);
  }
  $anchorSubsection.find(`#${spanId}`).text(formatFechaLima(isoTs));
}

// ------ Helper: crea campos dinámicos por cada documento adicional (solo muestra nombre) ------
function __renderCards(panelId, cartas) {
  if (!Array.isArray(cartas) || !cartas.length) return;
  cartas.forEach((carta) => {
    $p = $(`#${panelId} .section-cards`);
    if ($p.length) {
       let fecha = new Date(carta.fechaISO).toLocaleString("es-PE");
      const $card = $(`
               <section class="p-4 border rounded-lg bg-white shadow">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-lg font-semibold text-gray-800 mb-1">📄 Carta Generada</h2>
      <p class="text-sm text-gray-600">
        Fecha y hora:
        <span class="font-medium text-gray-900">${fecha}</span>
      </p>
    </div>

    <!-- Botones pequeños -->
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-2 py-1 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
        data-action="confirmar"
      >
        Confirmar
      </button>
    </div>
  </div>
</section>
      `);
      $p.append($card);
    }
  });
}


// --- MERGE helpers para no perder 'carta_*' ni metadata de docs ---
function mergeDocLists(prev = [], next = []) {
  // next (lo que está en la UI) manda en nombres y archivos,
  // pero preservamos last_carta_fecha del doc previo si existía.
  const byNamePrev = new Map(prev.map(d => [d?.nombre, d || {}]));
  return (next || []).map(d => {
    const p = byNamePrev.get(d?.nombre) || {};
    const last_carta_fecha = p.last_carta_fecha || d.last_carta_fecha;
    return { ...d, last_carta_fecha };
  });
}

function mergeOperacion(prevOp = {}, newOp = {}) {
  const merged = { ...prevOp, ...newOp };
  // preserva flags/fecha de carta si el nuevo no los trae
  merged.carta_generada = newOp.carta_generada ?? prevOp.carta_generada;
  merged.carta_fecha    = newOp.carta_fecha    ?? prevOp.carta_fecha;
  // docs
  merged.docs_by_area    = mergeDocLists(prevOp.docs_by_area, newOp.docs_by_area);
  merged.docs_adic_files = merged.docs_by_area; // compat
  return merged;
}

function mergeTransfer(prevT = {}, newT = {}) {
  const merged = { ...prevT, ...newT };
  merged.carta_generada = newT.carta_generada ?? prevT.carta_generada;
  merged.carta_fecha    = newT.carta_fecha    ?? prevT.carta_fecha;
  merged.docs_by_area    = mergeDocLists(prevT.docs_by_area, newT.docs_by_area);
  merged.docs_adic_files = merged.docs_by_area;
  return merged;
}


const $tpl = $('#tplTransferencia');
const $panelContainer = $('#transfer-panels');
let transfSeq = 0;

function initSelect2($sel, items){ $sel.select2({ data: items, placeholder:'Selecciona...', width:'100%' }); }
function loadCuentas($selCuenta, bancoId){
  const items = (CUENTAS[bancoId] || []).map(n => ({ id:n, text:n }));
  $selCuenta.empty().select2({ data: items, width:'100%' });
}
function attachMoneyMask(input){
  if (!input) return;
  return new Cleave(input,{ numeral:true, numeralThousandsGroupStyle:'thousand', numeralDecimalScale:2 });
}
function parseMoney(str){ return Number(String(str||'').replace(/[^\d.-]/g,''))||0; }
function formatMoney(n){ return new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0); }

/* ========= chips / archivos / helpers visuales ========= */
let _seq = 0;
const uid = ()=>'f_'+Date.now().toString(36)+'_'+(_seq++).toString(36);

function fileMeta(file){
  return { id: uid(), name: file.name, size: file.size||null, type: file.type||'application/pdf', added_at: new Date().toISOString() };
}
function fileChip(meta){
  const sizeKb = meta.size!=null ? ` (${Math.round(meta.size/1024)} KB)` : '';
  return `<span class="file-chip" data-id="${meta.id}" data-name="${meta.name}" data-size="${meta.size||''}" data-type="${meta.type}">
            ${meta.name}${sizeKb}<span class="x" title="Quitar">×</span>
          </span>`;
}
function bindDocsGrid($grid){
  // subir archivos
  $grid.off('change','.doc-file').on('change','.doc-file', function(){
    const files = Array.from(this.files||[]);
    const $list = $(this).closest('.doc-card').find('.doc-file-list');
    files.map(fileMeta).forEach(m => $list.append(fileChip(m)));
    $(this).val('');
    saveToStorage(false);
  });
  // quitar archivo
  $grid.off('click','.file-chip .x').on('click','.file-chip .x', function(){
    $(this).closest('.file-chip').remove();
    saveToStorage(false);
  });
  // quitar tarjeta solo si es removible
  $grid.off('click','.doc-remove').on('click','.doc-remove', function(){
    $(this).closest('.doc-card').remove();
    saveToStorage();
  });
}


function docCardHtml(nombre, removable=false){
  return `
  <div class="doc-card" data-nombre="${nombre}">
    <div class="flex items-center justify-between mb-2">
      <div class="doc-title">${nombre}</div>
      ${removable ? '<button type="button" class="doc-remove">X</button>' : ''}
    </div>
    <div class="border-0">
      <label class="dz-select">
        <input type="file" class="doc-file" accept="application/pdf" multiple hidden>
        <span class="dz-btn">Seleccionar archivo</span>
        <span class="dz-sub">PDF</span>
      </label>
      <div class="doc-file-list mt-2"></div>
    </div>
  </div>`;
}
function renderDocsGrid($grid, items){
  // items: [{nombre, files:[{...}]}]
  $grid.empty();
  const defaults = new Set(DEFAULT_DOCS);
  // default cards (no removibles)
  DEFAULT_DOCS.forEach(n => $grid.append(docCardHtml(n,false)));
  // extras (removibles)
  (items||[]).filter(d => !defaults.has(d.nombre))
             .forEach(d => $grid.append(docCardHtml(d.nombre,true)));
  // pintar archivos existentes
  (items||[]).forEach(d=>{
    const $list = $grid.find(`.doc-card[data-nombre="${CSS.escape(d.nombre)}"] .doc-file-list`);
    (d.files||[]).forEach(m => $list.append(fileChip(m)));
  });
  bindDocsGrid($grid);
}
function gatherDocsFromGrid($grid){
  const out = [];
  $grid.find('.doc-card').each(function(){
    const nombre = $(this).data('nombre');
    const files = $(this).find('.file-chip').toArray().map(el=>{
      const $el = $(el);
      return {
        id: $el.data('id'),
        name: $el.data('name'),
        size: $el.data('size') ? Number($el.data('size')) : null,
        type: $el.data('type') || 'application/pdf',
        added_at: new Date().toISOString()
      };
    });
    out.push({ nombre, files });
  });
  return out;
}

/* =====================  Tabs ===================== */
function switchTab(id){
  $('.oc-tab').removeClass('is-active').attr('aria-selected','false');
  $('.oc-panel').removeClass('is-active');
  $(`[data-tab="${id}"]`).addClass('is-active').attr('aria-selected','true');
  $(`#${id}`).addClass('is-active');
}
function renumerarTabs(){
  $('.oc-tablist .oc-tab[data-kind="trf"]').each(function(i){
    $(this).text(`Transferencia ${i + 1}`);
    const panelId = $(this).data('tab');
    $(`#${panelId}`).find('.trf-title .num').text(i + 1);
  });
}

/* =====================  SERIALIZACIÓN ===================== */
function serializeOperacion(){
  const docs = gatherDocsFromGrid($('#oc_docs_grid'));
  return {
    moneda_origen   : $('#oc_moneda_origen').val(),
    importe_origen  : parseMoney($('#oc_importe_origen').val()),
    tipo_cambio     : Number(($('#oc_tipo_cambio').val() || '').toString().replace(',', '.')) || 0,
    moneda_destino  : $('#oc_moneda_destino').val(),
    importe_destino : parseMoney($('#oc_importe_destino').val()),
    banco_cargo     : $('#oc_banco_cargo').val(),
    cuenta_cargo    : $('#oc_cuenta_cargo').val(),
    banco_destino   : $('#oc_banco_destino').val(),
    cuenta_destino  : $('#oc_cuenta_destino').val(),
    fecha           : $('#oc_fecha').val(),
    // comisión global
    fondo           : parseMoney($('#oc_fondo').val()),
    comision        : parseMoney($('#oc_comision').val()),
    total           : parseMoney($('#oc_total').val()),
    // sustentos (nuevo formato)
    docs_by_area    : docs,
    // compat con vistas previas
    docs_adic_files : docs
  };
}
function serializeTransfer($panel){
  const docs = gatherDocsFromGrid($panel.find('.trf-docs-grid'));
  return {
    moneda         : $panel.find('.sel-moneda').val(),
    monto          : parseMoney($panel.find('.txt-monto').val()),
    banco_cargo    : $panel.find('.sel-banco-cargo').val(),
    cuenta_cargo   : $panel.find('.sel-cuenta-cargo').val(),
    banco_destino  : $panel.find('.sel-banco-destino').val(),
    cuenta_destino : $panel.find('.sel-cuenta-destino').val(),
    // comisión por transferencia
    fondo          : parseMoney($panel.find('.trf-fondo').val()),
    comision       : parseMoney($panel.find('.trf-comision').val()),
    total          : parseMoney($panel.find('.trf-total').val()),
    // sustentos por transferencia
    docs_by_area   : docs,
    docs_adic_files: docs
  };
}

function collectAll(prevData = null){
  const transferencias = [];
  $panelContainer.children('.oc-panel').each(function(i){
    const newT  = serializeTransfer($(this));
    const prevT = (prevData?.transferencias && prevData.transferencias[i]) || {};
    transferencias.push(mergeTransfer(prevT, newT));
  });

  const newOp  = serializeOperacion();
  const prevOp = prevData?.operacion || {};

  return {
    meta: {
      ...(prevData?.meta || {}),
      savedAt: new Date().toISOString(),
      version: STORAGE_VERSION
    },
    operacion: mergeOperacion(prevOp, newOp),
    transferencias
  };
}


/* =====================  STORAGE ===================== */
function saveToStorage(showToast = true){
  try {
    const prev = loadFromStorage() || {};
    const data = collectAll(prev); // << mezcla en vez de sobrescribir
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (showToast && window.toastr) toastr.success('Borrador guardado localmente');
    return data;
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
    if (window.toastr) toastr.error('No se pudo guardar el borrador');
  }
}

function loadFromStorage(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error leyendo localStorage:', e);
    return null;
  }
}
function clearStorage(){
  localStorage.removeItem(STORAGE_KEY);
  if (window.toastr) toastr.info('Borrador local eliminado');
}

/* =====================  POBLADO (RESTORE) ===================== */
function populateOperacion(op){
  if (!op) return;
  $('#oc_moneda_origen').val(op.moneda_origen).trigger('change');
  $('#oc_importe_origen').val(op.importe_origen ? formatMoney(op.importe_origen) : '');
  $('#oc_tipo_cambio').val(op.tipo_cambio || '');
  $('#oc_moneda_destino').val(op.moneda_destino).trigger('change');
  $('#oc_importe_destino').val(op.importe_destino ? formatMoney(op.importe_destino) : '');
  // bancos/cuentas
  if (op.banco_cargo){
    $('#oc_banco_cargo').val(op.banco_cargo).trigger('change');
    loadCuentas($('#oc_cuenta_cargo'), op.banco_cargo);
    $('#oc_cuenta_cargo').val(op.cuenta_cargo).trigger('change');
  }
  if (op.banco_destino){
    $('#oc_banco_destino').val(op.banco_destino).trigger('change');
    loadCuentas($('#oc_cuenta_destino'), op.banco_destino);
    $('#oc_cuenta_destino').val(op.cuenta_destino).trigger('change');
  }
  if (op.fecha) $('#oc_fecha').val(op.fecha);

  // comisión/total
  if (typeof op.fondo === 'number')    $('#oc_fondo').val(formatMoney(op.importe_origen));
  if (typeof op.comision === 'number') $('#oc_comision').val(formatMoney(op.comision));
  if (typeof op.total === 'number')    $('#oc_total').val(formatMoney(op.total));

  // docs grid (usa docs_by_area si existe; si no, defaults)
  const docs = Array.isArray(op.docs_by_area) && op.docs_by_area.length
    ? op.docs_by_area
    : Array.isArray(op.docs_adic_files) && op.docs_adic_files.length
      ? op.docs_adic_files
      : DEFAULT_DOCS.map(n => ({ nombre:n, files:[] }));
  renderDocsGrid($('#oc_docs_grid'), docs);

   // En populateOperacion:
    if (op.carta_generada) {
      const ts = op.carta_fecha || (window.ocStorage?.load()?.meta?.cartaUpdatedAt);
      renderUltimaCarta($('#oc_card_operation_confirm'), ts, 'operacion'); // <-- usa el placeholder
    }

  // bloqueo global: todo disabled menos comisión y sustentos
  lockGlobal();
}
function populateTransfer($panel, t){
  if (!t) return;
  // básicos
  $panel.find('.sel-moneda').val(t.moneda).trigger('change');
  $panel.find('.txt-monto').val(t.monto ? formatMoney(t.monto) : '');
  if (t.banco_cargo){
    $panel.find('.sel-banco-cargo').val(t.banco_cargo).trigger('change');
    loadCuentas($panel.find('.sel-cuenta-cargo'), t.banco_cargo);
    $panel.find('.sel-cuenta-cargo').val(t.cuenta_cargo).trigger('change');
  }
  if (t.banco_destino){
    $panel.find('.sel-banco-destino').val(t.banco_destino).trigger('change');
    loadCuentas($panel.find('.sel-cuenta-destino'), t.banco_destino);
    $panel.find('.sel-cuenta-destino').val(t.cuenta_destino).trigger('change');
  }

  // comisión
  if (t.fondo != null)    $panel.find('.trf-fondo').val(formatMoney(17642500));
  if (t.comision != null) $panel.find('.trf-comision').val(formatMoney(t.comision));
  if (t.total != null)    $panel.find('.trf-total').val(formatMoney(17642500+ (t.comision||0)));

  // docs grid
  const docs = Array.isArray(t.docs_by_area) && t.docs_by_area.length
    ? t.docs_by_area
    : Array.isArray(t.docs_adic_files) && t.docs_adic_files.length
      ? t.docs_adic_files
      : DEFAULT_DOCS.map(n => ({ nombre:n, files:[] }));
  renderDocsGrid($panel.find('.trf-docs-grid'), docs);

  if (t.carta_generada) {
  const ts = t.carta_fecha || (window.ocStorage?.load()?.meta?.cartaUpdatedAt);
  const suff = $panel.attr('id');
  renderUltimaCarta($panel.find('.oc_card_transfer_confirm'), ts, suff); // <-- placeholder del panel
}

  // bloquear: todo disabled excepto comisión y sustentos
  $panel.find('input, select, textarea').prop('disabled', true);
  $panel.find('.sel2').prop('disabled', true).trigger('change.select2');
  $panel.find('.trf-total').prop('readonly', true);

  $panel.find('.trf-comision').prop('disabled', false).prop('readonly', false);
  $panel.find('.trf-docs-grid .doc-file').prop('disabled', false);
  $panel.find('.trf-btn-add-doc, .trf-doc-nombre').prop('disabled', false);
  $panel.find('.trf-docs-grid .doc-remove').prop('disabled', false);

      $('.inp-fecha').prop("disabled", false)
}

/* =====================  Crear tab + panel de Transferencia ===================== */
function addTransferTab(prefillData = null){
  transfSeq += 1;
  const panelId = `tab-trf-${transfSeq}`;
  const btnId   = `tabbtn-trf-${transfSeq}`;

  // botón tab ANTES de Operación
  const $btn = $(`<button class="oc-tab" role="tab" aria-selected="false"
            aria-controls="${panelId}" id="${btnId}"
            data-tab="${panelId}" data-kind="trf">Transferencia</button>`);
  $btn.insertBefore('#tabbtn-operacion');

  // panel
  const $panel = $($tpl.html())
    .attr('id', panelId)
    .attr('role','tabpanel')
    .attr('aria-labelledby', btnId);

  $panelContainer.append($panel);
  initTransferPanel($panel);
  if (prefillData) populateTransfer($panel, prefillData);

  renumerarTabs();
  saveToStorage(false);
}

function initTransferPanel($panel){
  // select2
  const $bCargo=$panel.find('.sel-banco-cargo'), $cCargo=$panel.find('.sel-cuenta-cargo');
  const $bDest =$panel.find('.sel-banco-destino'), $cDest =$panel.find('.sel-cuenta-destino');
  initSelect2($bCargo, BANCOS); initSelect2($bDest, BANCOS);
  initSelect2($cCargo, []);     initSelect2($cDest, []);
  $bCargo.on('change', () => loadCuentas($cCargo, $bCargo.val()));
  $bDest .on('change', () => loadCuentas($cDest , $bDest.val()));

  // máscaras
  attachMoneyMask($panel.find('.txt-monto')[0]);
  attachMoneyMask($panel.find('.trf-fondo')[0]);
  attachMoneyMask($panel.find('.trf-comision')[0]);
  attachMoneyMask($panel.find('.trf-total')[0]);

  // total dinámico
  function recalc(){ 
    const f = parseMoney($panel.find('.txt-monto').val());
    $panel.find('.trf-fondo').val(formatMoney(f));
    const c = parseMoney($panel.find('.trf-comision').val());

    $panel.find('.trf-total').val(formatMoney(17642500 + c));
  }
  $panel.on('input', '.trf-fondo, .trf-comision', ()=>{ recalc(); saveToStorage(false); });

  // eliminar transferencia
  $panel.find('.btnEliminarTransferencia').on('click', ()=>{
    const id = $panel.attr('id');
    $(`[data-tab="${id}"]`).remove();
    $panel.remove();
    renumerarTabs();
    switchTab('tab-operacion');
    saveToStorage();
  });

  // confirmar (demo)
  $panel.find('.trf-btn-confirmar').off('click').on('click', ()=>{
    saveToStorage(false);
    setEstado('transferencia', $panel.attr('id'), 'confirmado'); // estado + check en su tab
    Swal.fire({icon:'success',title:'Transferencia confirmada',timer:1200,showConfirmButton:false});
  });

  // alta de doc extra
  $panel.find('.trf-btn-add-doc').on('click', ()=>{
    const $inp = $panel.find('.trf-doc-nombre');
    const name = ($inp.val()||'').trim();
    if(!name) return toastr.warning('Escribe un nombre para el documento.');
    const $grid = $panel.find('.trf-docs-grid');
    $grid.append(docCardHtml(name,true));
    bindDocsGrid($grid);
    $inp.val('');
    saveToStorage(false);
  });

  // por defecto bloquear todo excepto comisión/sustentos
  $panel.find('input, select, textarea').prop('disabled', true);
  $panel.find('.sel2').prop('disabled', true).trigger('change.select2');
  $panel.find('.trf-total').prop('readonly', true);
  $panel.find('.trf-comision').prop('disabled', false).prop('readonly', false);
  $panel.find('.trf-docs-grid .doc-file').prop('disabled', false);
  $panel.find('.trf-btn-add-doc, .trf-doc-nombre').prop('disabled', false);

  wireCartaTransferencia($panel)
}

/* =====================  Global / Operación ===================== */
function initGlobal(){
  // tabs: click para cambiar
  $(document).on('click','.oc-tab',function(){
    const id = $(this).data('tab') || this.id.replace('tabbtn-','tab-');
    if(id) switchTab(id);
  });

  // select2
  initSelect2($('#oc_banco_cargo'), BANCOS);
  initSelect2($('#oc_banco_destino'), BANCOS);
  initSelect2($('#oc_cuenta_cargo'), []);
  initSelect2($('#oc_cuenta_destino'), []);
  $('#oc_banco_cargo').on('change', ()=> loadCuentas($('#oc_cuenta_cargo'), $('#oc_banco_cargo').val()));
  $('#oc_banco_destino').on('change', ()=> loadCuentas($('#oc_cuenta_destino'), $('#oc_banco_destino').val()));

  // máscaras
  attachMoneyMask(document.getElementById('oc_importe_origen'));
  attachMoneyMask(document.getElementById('oc_importe_destino'));
  attachMoneyMask(document.getElementById('oc_fondo'));
  attachMoneyMask(document.getElementById('oc_comision'));
  attachMoneyMask(document.getElementById('oc_total'));

  // total global
  function recalcGlobal(){
    const total = parseMoney($('#oc_fondo').val()) + parseMoney($('#oc_comision').val());
    $('#oc_total').val(formatMoney(total));
  }
  $('#oc_fondo, #oc_comision').on('input', ()=>{ recalcGlobal(); saveToStorage(false); });

  // Docs GLOBAL: defaults + agregar doc extra
  renderDocsGrid($('#oc_docs_grid'), DEFAULT_DOCS.map(n => ({nombre:n, files:[]})));
  $('#oc_btn_add_doc').on('click', ()=>{
    const $inp = $('#oc_doc_nombre');
    const name = ($inp.val()||'').trim();
    if(!name) return toastr.warning('Escribe un nombre para el documento.');
    const $grid = $('#oc_docs_grid');
    $grid.append(docCardHtml(name, true));
    bindDocsGrid($grid);
    $inp.val('');
    saveToStorage(false);
  });

  // botonería
  $('#btnGenerarCarta').on('click', ()=>{ saveToStorage(); toastr.success('Borrador guardado y carta generada (demo)'); });
  $('#btnCancelar').on('click', ()=> Swal.fire({icon:'info',title:'Acción cancelada',timer:1100,showConfirmButton:false}));
  $('#formOperacion').off('submit').on('submit', function(e){
    e.preventDefault();
    saveToStorage(false);                              // guarda la UI actual
    setEstado('operacion', 'tab-operacion', 'confirmado'); // marca estado + check
    Swal.fire({icon:'success',title:'Operación confirmada',timer:1200,showConfirmButton:false});
    abrirPdfConsolidado();
  });

  // helpers
  window.ocStorage = { save: saveToStorage, load: loadFromStorage, clear: clearStorage };
}

/* =====================  RESTORE ===================== */
function restoreFromStorage(){
  const data = loadFromStorage();
  if (!data) return;
  populateOperacion(data.operacion);
  (data.transferencias || []).forEach(t => addTransferTab(t));
  applyEstadoBadges(data); // <<< pinta checks según estados guardados
  toastr?.info('Se restauró un borrador local');
}


/* ============ Locks (vista) ============ */
function lockGlobal(){
  const $s1 = $('.dashed.card');
  $s1.find('input, select, textarea').prop('disabled', true);
  $s1.find('.sel2').prop('disabled', true).trigger('change.select2');

  $('#oc_fondo').prop('disabled', true);
  $('#oc_total').prop('disabled', true).prop('readonly', true);
  $('#oc_comision').prop('disabled', false); // editable
  $('.inp-fecha').prop('disabled', false); // editable

  // Sustentos (grilla) activos
  $('#oc_docs_grid .doc-file').prop('disabled', false);
  $('#oc_doc_nombre, #oc_btn_add_doc').prop('disabled', false);
}

/* =====================  Enrutado a “Generar Carta”  ===================== */
const CARTA_CTX_KEY = 'oc_carta_context';

/**
 * Guarda contexto y navega a la vista de carta.
 * @param {'operacion'|'transferencia'} scope
 * @param {string} tabId - 'tab-operacion' | 'tab-trf-1' | 'tab-trf-2' ...
 * @param {string} route - url de la vista de carta
 */
function goToCarta(scope, tabId, route){
  // 1) Guarda el borrador actual
  saveToStorage(false);

  // 2) Guarda un contexto en LS (backup por si se pierde el querystring)
  const ctx = {
    scope,          // 'operacion' | 'transferencia'
    tabId,          // id del tab que originó la carta
    storageKey: STORAGE_KEY,
    storageVersion: STORAGE_VERSION,
    ts: Date.now()
  };
  localStorage.setItem(CARTA_CTX_KEY, JSON.stringify(ctx));

  // 3) También lo mandamos en el querystring
  const url = new URL(route, window.location.href);
  url.searchParams.set('scope', scope);
  url.searchParams.set('id', tabId);


    const qs = new URLSearchParams({
      scope: scope,
      id: tabId
    }).toString();
  window.location.href = `${route}?${qs}&area=Tesoreria&storage_key_carta=${STORAGE_KEY}`;
}

/* =====================  Hooks de botones “Generar Carta”  ===================== */
// OPERACIÓN (usa el tab fijo 'tab-operacion')
$('#btnGenerarCarta').off('click').on('click', () => {
  goToCarta('operacion', 'tab-operacion', 'generar-carta-operacion-cambiaria.html');
});

// TRANSFERENCIAS (dentro de initTransferPanel)
function wireCartaTransferencia($panel){
  $panel.find('.trf-btn-carta').off('click').on('click', () => {
    const tabId = $panel.attr('id'); // ej: 'tab-trf-3'
    goToCarta('transferencia', tabId, 'generar-carta-operacion-cambiaria.html');
  });
}
// Llama a wireCartaTransferencia($panel) al final de initTransferPanel($panel)



/* =====================  INIT ===================== */
$(function(){
  initGlobal();

  
      // Wireup
  document.getElementById("btnVerPdfConsolidado")?.addEventListener("click", abrirPdfConsolidado);
  document.getElementById("btnCerrarModal")?.addEventListener("click", cerrarModalPdf);
  document.getElementById("pdfModal")?.addEventListener("click", function (e) {
    if (e.target === this) cerrarModalPdf();
  });



  restoreFromStorage(); // restauración automática
               function getAreaParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("area");
  }

  const area = getAreaParam();
  if (area) {
    document.getElementById("area-badge").textContent = "Perfil: " + area;
  }

});



//PDF COMPROBANTE
// ===================== Helpers =====================
function getAllSnaps(KEY = "oc_operacion_v1") {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);

    // Soporta: array de operaciones o un solo objeto
    const arr = Array.isArray(parsed) ? parsed : [parsed];

    // Filtra y normaliza lo mínimo
    return arr.filter(x => x && x.operacion && Array.isArray(x.transferencias));
  } catch {
    return [];
  }
}

const fmt = {
  money(v) {
    const n = Number(v ?? 0);
    return isFinite(n) ? n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v ?? '-');
  },
  date(d) {
    if (!d) return '-';
    // admite 'YYYY-MM-DD' o ISO
    const dt = new Date(d);
    return isNaN(dt) ? String(d) : dt.toLocaleString('es-PE');
  },
  text(v) { return (v ?? '-') + ''; }
};

// ===================== PDF Builder =====================
async function buildMergedPdfBlob() {
  const snaps = getAllSnaps();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const LEFT = 56;
  const TOP  = 72;
  const LINE = 20;

  if (snaps.length === 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("No hay datos para mostrar.", LEFT, TOP);
    return doc.output("blob");
  }

  snaps.forEach((snap, idxOp) => {
    const op = snap.operacion || {};
    const trfs = Array.isArray(snap.transferencias) ? snap.transferencias : [];
    const opNum = idxOp + 1;

    if (idxOp > 0) doc.addPage();

    // ===== Página Operación =====
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Operación ${opNum}`, LEFT, TOP);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    let y = TOP + 2*LINE;
    const linea = (label, value) => {
      doc.setFont("helvetica", "bold"); doc.text(label, LEFT, y);
      doc.setFont("helvetica", "normal"); doc.text(String(value ?? "-"), LEFT + 180, y);
      y += LINE;
    };

    linea("Moneda origen:", op.moneda_origen);
    linea("Importe origen:", fmt.money(op.importe_origen));
    linea("Tipo de cambio:", op.tipo_cambio);
    linea("Moneda destino:", op.moneda_destino);
    linea("Importe destino:", fmt.money(op.importe_destino));
    linea("Banco (cargo):", op.banco_cargo);
    linea("Cuenta (cargo):", op.cuenta_cargo);
    linea("Banco (destino):", op.banco_destino);
    linea("Cuenta (destino):", op.cuenta_destino);
    linea("Fecha:", op.fecha ? fmt.date(op.fecha) : "-");
    linea("Estado:", op.estado);
    linea("Fondo:", fmt.money(op.fondo));
    linea("Comisión:", fmt.money(op.comision));
    linea("Total:", fmt.money(op.total));
    if (op.carta_generada) {
      linea("Carta generada:", op.carta_generada ? "Sí" : "No");
      linea("Fecha de carta:", fmt.date(op.carta_fecha));
    }

    // Documentos operación
    y += LINE/2;
    doc.setFont("helvetica", "bold");
    doc.text("Documentos por área (operación):", LEFT, y);
    doc.setFont("helvetica", "normal"); y += LINE;

    (op.docs_by_area || []).forEach(grp => {
      const nombre = grp?.nombre ?? "Grupo";
      const files = Array.isArray(grp?.files) ? grp.files : [];
      doc.text(`• ${nombre} (${files.length} archivo(s))`, LEFT, y); y += LINE;
      files.forEach(f => { doc.text(`   - ${String(f?.nombre || f)}`, LEFT, y); y += LINE; });
    });

    if ((op.docs_adic_files || []).length) {
      y += LINE/2;
      doc.setFont("helvetica", "bold");
      doc.text("Documentos adicionales (operación):", LEFT, y);
      doc.setFont("helvetica", "normal"); y += LINE;

      (op.docs_adic_files || []).forEach(grp => {
        const nombre = grp?.nombre ?? "Grupo";
        const files = Array.isArray(grp?.files) ? grp.files : [];
        doc.text(`• ${nombre} (${files.length} archivo(s))`, LEFT, y); y += LINE;
        files.forEach(f => { doc.text(`   - ${String(f?.nombre || f)}`, LEFT, y); y += LINE; });
      });
    }

    // ===== Páginas por transferencia =====
    trfs.forEach((t, idxT) => {
      doc.addPage();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text(`Transferencia #${idxT + 1} (Operación ${opNum})`, LEFT, TOP);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      let yy = TOP + 2*LINE;
      const pl = (label, value) => {
        doc.setFont("helvetica", "bold"); doc.text(label, LEFT, yy);
        doc.setFont("helvetica", "normal"); doc.text(String(value ?? "-"), LEFT + 200, yy);
        yy += LINE;
      };

      pl("Moneda:", t.moneda);
      pl("Monto:", fmt.money(t.monto ?? t.montoRaw));
      pl("Banco (cargo):", t.banco_cargo || t.bancoCargoTxt || t.bancoCargoId);
      pl("Cuenta (cargo):", t.cuenta_cargo || t.cuentaCargoTxt || t.cuentaCargoId);
      pl("Banco (destino):", t.banco_destino || t.bancoDestinoTxt || t.bancoDestinoId);
      pl("Cuenta (destino):", t.cuenta_destino || t.cuentaDestinoTxt || t.cuentaDestinoId);
      pl("Estado:", t.estado);
      pl("Fondo:", fmt.money(t.fondo));
      pl("Comisión:", fmt.money(t.comision));
      pl("Total:", fmt.money(t.total));
      if (t.carta_generada) {
        pl("Carta generada:", t.carta_generada ? "Sí" : "No");
        pl("Fecha de carta:", fmt.date(t.carta_fecha));
      }

      // Documentos transferencia
      yy += LINE/2;
      doc.setFont("helvetica", "bold");
      doc.text("Documentos por área (transferencia):", LEFT, yy);
      doc.setFont("helvetica", "normal"); yy += LINE;

      (t.docs_by_area || []).forEach(grp => {
        const nombre = grp?.nombre ?? "Grupo";
        const files = Array.isArray(grp?.files) ? grp.files : [];
        doc.text(`• ${nombre} (${files.length} archivo(s))`, LEFT, yy); yy += LINE;
        files.forEach(f => { doc.text(`   - ${String(f?.nombre || f)}`, LEFT, yy); yy += LINE; });
      });

      if ((t.docs_adic_files || []).length) {
        yy += LINE/2;
        doc.setFont("helvetica", "bold");
        doc.text("Documentos adicionales (transferencia):", LEFT, yy);
        doc.setFont("helvetica", "normal"); yy += LINE;

        (t.docs_adic_files || []).forEach(grp => {
          const nombre = grp?.nombre ?? "Grupo";
          const files = Array.isArray(grp?.files) ? grp.files : [];
          doc.text(`• ${nombre} (${files.length} archivo(s))`, LEFT, yy); yy += LINE;
          files.forEach(f => { doc.text(`   - ${String(f?.nombre || f)}`, LEFT, yy); yy += LINE; });
        });
      }
    });
  });

  return doc.output("blob");
}

// ===================== Modal handlers =====================
async function abrirPdfConsolidado() {
  const blob = await buildMergedPdfBlob();
  const url = URL.createObjectURL(blob);

  const iframe = document.getElementById("pdfViewer");
  iframe.src = url;

  const dl = document.getElementById("btnDescargarPdf");
  dl.href = url;

  const modal = document.getElementById("pdfModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  const cleanup = () => {
    iframe.src = "about:blank";
    dl.href = "#";
    URL.revokeObjectURL(url);
  };
  modal._cleanupPdfUrl = cleanup;
}

function cerrarModalPdf() {
  const modal = document.getElementById("pdfModal");
  if (modal._cleanupPdfUrl) modal._cleanupPdfUrl();
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}
