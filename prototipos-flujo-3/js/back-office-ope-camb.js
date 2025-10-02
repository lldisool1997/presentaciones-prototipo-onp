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

/* =====================  HELPERS UI  ===================== */
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

function ensure($root, selector, html){
  if (!$root.find(selector).length) $root.append(html);
  return $root.find(selector).first();
}
function fileMeta(file){
  return { id: uid(), name: file.name, size: file.size||null, type: file.type||'application/pdf', added_at: new Date().toISOString() };
}
function fileChip(meta){
  const sizeKb = meta.size!=null ? ` (${Math.round(meta.size/1024)} KB)` : '';
  return `<span class="file-chip" data-id="${meta.id}" data-name="${meta.name}" data-size="${meta.size||''}" data-type="${meta.type}">
            ${meta.name}${sizeKb}<span class="x" title="Quitar">×</span>
          </span>`;
}
function bindFileChipRemove($scope){
  $scope.off('click','.file-chip .x').on('click','.file-chip .x',function(){
    $(this).closest('.file-chip').remove();
    saveToStorage(false);
  });
}
function addDocChip($wrap, name){
  const n = (name||'').trim();
  if(!n) return;
  const $chip = $(`
    <span class="doc-tag" data-nombre="${n}">
      ${n}
      <button type="button" class="clip" title="Adjuntar">📎</button>
      <span class="x" title="Quitar">×</span>
      <span class="doc-files"></span>
      <input type="file" class="doc-file-input" accept="application/pdf" multiple hidden>
    </span>
  `);
  $chip.find('.x').on('click',()=>{ $chip.remove(); saveToStorage(false); });
  const $inp = $chip.find('.doc-file-input');
  $chip.find('.clip').on('click',()=> $inp.trigger('click'));
  $inp.on('change', function(){
    const files = Array.from(this.files||[]);
    const $list = $chip.find('.doc-files');
    files.map(fileMeta).forEach(m => $list.append(fileChip(m)));
    bindFileChipRemove($chip);
    this.value = '';
    saveToStorage(false);
  });
  $wrap.append($chip);
}

/* =====================  Tabs ===================== */
function switchTab(id){
  $('.oc-tab').removeClass('is-active').attr('aria-selected','false');
  $('.oc-panel').removeClass('is-active');
  $(`[data-tab="${id}"]`).addClass('is-active').attr('aria-selected','true');
  $(`#${id}`).addClass('is-active');
}
function renumerarTabs(){
  // usa el orden visual actual: todas las transferencias se ubican antes de "Operación"
  $('.oc-tablist .oc-tab[data-kind="trf"]').each(function(i){
    $(this).text(`Transferencia ${i + 1}`);
    const panelId = $(this).data('tab');
    $(`#${panelId}`).find('.trf-title .num').text(i + 1);
  });
}

/* =====================  SERIALIZACIÓN ===================== */
function gatherFilesFrom($root){
  return $root.find('.file-chip').toArray().map(el => {
    const $el = $(el);
    return {
      id: $el.data('id'),
      name: $el.data('name'),
      size: $el.data('size') ? Number($el.data('size')) : null,
      type: $el.data('type') || 'application/pdf',
      added_at: new Date().toISOString()
    };
  });
}
function gatherDocFilesFrom($scope){
  const out = [];
  $scope.find('.doc-tag').each(function(){
    const nombre = $(this).data('nombre') || $(this).text().replace('×','').trim();
    const files = gatherFilesFrom($(this).find('.doc-files'));
    out.push({ nombre, files });
  });
  return out;
}

function serializeOperacion(){
  const $dz = $('.dropzone').first();
  const $filesBox = ensure($dz, '#oc_files', '<div id="oc_files" class="file-list mt-2"></div>');
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
    // comisión + sustento global
    fondo           : parseMoney($('#oc_fondo').val()),
    comision        : parseMoney($('#oc_comision').val()),
    total           : parseMoney($('#oc_total').val()),
    sustento_pdf    : ($('#oc_filename').text() || '').replace('•','').trim() || null,
    docs_adic       : $('#oc_docs .doc-tag').toArray().map(e => $(e).dataset.nombre || $(e).text().replace('×','').trim()),
    sustentos       : gatherFilesFrom($filesBox),
    docs_adic_files : gatherDocFilesFrom($('#oc_docs'))
  };
}
function serializeTransfer($panel){
  const $filesBox = ensure($panel.find('.dropzone'), '.trf-files', '<div class="trf-files file-list mt-2"></div>');
  return {
    moneda         : $panel.find('.sel-moneda').val(),
    monto          : parseMoney($panel.find('.txt-monto').val()),
    banco_cargo    : $panel.find('.sel-banco-cargo').val(),
    cuenta_cargo   : $panel.find('.sel-cuenta-cargo').val(),
    banco_destino  : $panel.find('.sel-banco-destino').val(),
    cuenta_destino : $panel.find('.sel-cuenta-destino').val(),
    // comisión + sustento por transferencia
    fondo          : parseMoney($panel.find('.trf-fondo').val()),
    comision       : parseMoney($panel.find('.trf-comision').val()),
    total          : parseMoney($panel.find('.trf-total').val()),
    sustento_pdf   : ($panel.find('.dz-filename').text() || '').replace('•','').trim() || null,
    docs_adic      : $panel.find('.trf-docs .doc-tag').toArray().map(e => $(e).dataset.nombre || $(e).text().replace('×','').trim()),
    sustentos      : gatherFilesFrom($filesBox),
    docs_adic_files: gatherDocFilesFrom($panel.find('.trf-docs'))
  };
}
function collectAll(){
  const transferencias = [];
  $panelContainer.children('.oc-panel').each(function(){
    transferencias.push(serializeTransfer($(this)));
  });
  return {
    meta: { savedAt: new Date().toISOString(), version: STORAGE_VERSION },
    operacion: serializeOperacion(),
    transferencias
  };
}

/* =====================  STORAGE ===================== */
function saveToStorage(showToast = true){
  try {
    const data = collectAll();
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
  // bancos/cuentas (cargar cuentas según banco)
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

  // comisión + total
  if (typeof op.fondo === 'number')   $('#oc_fondo').val(formatMoney(op.fondo));
  if (typeof op.comision === 'number')$('#oc_comision').val(formatMoney(op.comision));
  if (typeof op.total === 'number')   $('#oc_total').val(formatMoney(op.total));

  // Sustento (nombre principal + lista de archivos)
  $('#oc_filename').text(op.sustento_pdf ? `• ${op.sustento_pdf}` : '');
  const $dz = $('.dropzone').first();
  const $filesBox = ensure($dz, '#oc_files', '<div id="oc_files" class="file-list mt-2"></div>');
  $filesBox.empty();
  (op.sustentos || []).forEach(m => $filesBox.append(fileChip(m)));
  bindFileChipRemove($filesBox);

  // Docs adicionales (con adjuntos por doc si existen)
  const $docs = $('#oc_docs').empty();
  if (Array.isArray(op.docs_adic_files) && op.docs_adic_files.length){
    op.docs_adic_files.forEach(item=>{
      addDocChip($docs, item.nombre);
      const $last = $docs.find('.doc-tag').last();
      const $list = $last.find('.doc-files');
      (item.files||[]).forEach(m => $list.append(fileChip(m)));
      bindFileChipRemove($last);
    });
  } else {
    (op.docs_adic || []).forEach(n => addDocChip($docs, n));
  }

  lockGlobal();
}
function populateTransfer($panel, t){
  if (!t) return;

  // Poblar datos
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

  // (si llegan estos campos, pónlos)
  if (t.fondo       != null) $panel.find('.trf-fondo').val(formatMoney(t.fondo));
  if (t.comision    != null) $panel.find('.trf-comision').val(formatMoney(t.comision));
  if (t.total       != null) $panel.find('.trf-total').val(formatMoney(t.total));
  if (t.sustento_pdf)         $panel.find('.dz-filename').text('• ' + t.sustento_pdf);

  // Render archivos de la transferencia (lista propia)
  const $filesBox = ensure($panel.find('.dropzone'), '.trf-files', '<div class="trf-files file-list mt-2"></div>');
  $filesBox.empty();
  (t.sustentos || []).forEach(m => $filesBox.append(fileChip(m)));
  bindFileChipRemove($panel);

  // Docs adicionales + archivos por doc
  const $docs = $panel.find('.trf-docs').empty();
  if (Array.isArray(t.docs_adic_files) && t.docs_adic_files.length){
    t.docs_adic_files.forEach(item=>{
      addDocChip($docs, item.nombre);
      const $last = $docs.find('.doc-tag').last();
      const $list = $last.find('.doc-files');
      (item.files||[]).forEach(m => $list.append(fileChip(m)));
      bindFileChipRemove($last);
    });
  } else {
    (t.docs_adic || []).forEach(n => addDocChip($docs, n));
  }

  // === Deshabilitar TODO ===
  $panel.find('input, select, textarea, button').prop('disabled', true);
  $panel.find('.sel2').prop('disabled', true).trigger('change.select2');
  $panel.find('.trf-total').prop('readonly', true);

  // === Rehabilitar lo permitido ===
  // Comisión y sustentos activos
  $panel.find('.trf-comision').prop('disabled', false).prop('readonly', false);
  $panel.find('.trf-file').prop('disabled', false);
  $panel.find('.trf-doc-nombre, .trf-btn-add-doc').prop('disabled', false);
}

/* =====================  Crear tab + panel de Transferencia ===================== */
function addTransferTab(prefillData = null){
  transfSeq += 1;
  const panelId = `tab-trf-${transfSeq}`;
  const btnId   = `tabbtn-trf-${transfSeq}`;

  // botón tab: insertar **justo antes** del tab "Operación" y no tomar foco
  const $btn = $(`
    <button class="oc-tab" role="tab" aria-selected="false"
            aria-controls="${panelId}" id="${btnId}"
            data-tab="${panelId}" data-kind="trf">
      Transferencia
    </button>
  `);
  $btn.insertBefore('#tabbtn-operacion');

  // panel (oculto por defecto)
  const $panel = $($tpl.html())
    .attr('id', panelId)
    .attr('role', 'tabpanel')
    .attr('aria-labelledby', btnId);

  $panelContainer.append($panel);

  // init UI del panel
  initTransferPanel($panel);

  // prefill si se pasó data
  if (prefillData) populateTransfer($panel, prefillData);

  // renumera por orden visual y guarda
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

  // recalculo total: fondo + comisión
  function recalc(){ 
    const f = parseMoney($panel.find('.trf-fondo').val());
    const c = parseMoney($panel.find('.trf-comision').val());
    $panel.find('.trf-total').val(formatMoney(f + c));
  }
  $panel.on('input', '.trf-fondo, .trf-comision', ()=>{ recalc(); saveToStorage(false); });

  // eliminar transferencia: quita tab y panel + guarda
  $panel.find('.btnEliminarTransferencia').on('click', ()=>{
    const id = $panel.attr('id');
    $(`[data-tab="${id}"]`).remove();
    $panel.remove();
    renumerarTabs();
    switchTab('tab-operacion'); // vuelve a Operación
    saveToStorage();
  });

  // confirmar (demo) + guardar
  $panel.find('.trf-btn-confirmar').on('click', ()=>{
    saveToStorage();
    Swal.fire({icon:'success',title:'Transferencia confirmada (guardada localmente)',timer:1200,showConfirmButton:false});
  });

  // === Sustento de la transferencia (simulación múltiples archivos) ===
  const $dz = $panel.find('.dropzone');
  const $filesBox = ensure($dz, '.trf-files', '<div class="trf-files file-list mt-2"></div>');

  $panel.find('.trf-file').on('change', function(){
    const files = Array.from(this.files || []);
    if (!files.length) return;
    $panel.find('.dz-filename').text('• ' + files[0].name); // nombre “principal”
    files.map(fileMeta).forEach(m => $filesBox.append(fileChip(m)));
    bindFileChipRemove($panel);
    this.value = ''; // reset input
    saveToStorage(false);
  });

  // Docs adicionales (con adjuntos)
  $panel.find('.trf-btn-add-doc').on('click', ()=>{
    const $inp = $panel.find('.trf-doc-nombre');
    const name = ($inp.val()||'').trim();
    if (!name) return toastr.warning('Escribe un nombre para el documento.');
    addDocChip($panel.find('.trf-docs'), name);
    $inp.val('');
    saveToStorage(false);
  });

  // por defecto, bloquear todo excepto comisión y sustentos
  // (si viene prefill, populateTransfer ya hace esto; si es nuevo, también lo hacemos)
  $panel.find('input, select, textarea, button').prop('disabled', true);
  $panel.find('.sel2').prop('disabled', true).trigger('change.select2');
  $panel.find('.trf-total').prop('readonly', true);
  $panel.find('.trf-comision').prop('disabled', false).prop('readonly', false);
  $panel.find('.trf-file').prop('disabled', false);
  $panel.find('.trf-doc-nombre, .trf-btn-add-doc').prop('disabled', false);
}

/* =====================  Global / Operación ===================== */
function initGlobal(){
  // tabs: click para cambiar
  $(document).on('click','.oc-tab',function(){
    const id = $(this).data('tab') || this.id.replace('tabbtn-','tab-');
    if(id) switchTab(id);
  });
  // añadir transferencia
  $('#btnAddTransferencia').on('click', ()=> addTransferTab());

  // select2
  initSelect2($('#oc_banco_cargo'), BANCOS);
  initSelect2($('#oc_banco_destino'), BANCOS);
  initSelect2($('#oc_cuenta_cargo'), []);
  initSelect2($('#oc_cuenta_destino'), []);
  $('#oc_banco_cargo').on('change', ()=> loadCuentas($('#oc_cuenta_cargo'), $('#oc_banco_cargo').val()));
  $('#oc_banco_destino').on('change', ()=> loadCuentas($('#oc_cuenta_destino'), $('#oc_banco_destino').val()));

  // máscaras de importes
  attachMoneyMask(document.getElementById('oc_importe_origen'));
  attachMoneyMask(document.getElementById('oc_importe_destino'));
  attachMoneyMask(document.getElementById('oc_fondo'));
  attachMoneyMask(document.getElementById('oc_comision'));
  attachMoneyMask(document.getElementById('oc_total'));

  // recalculo total global
  function recalcGlobal(){
    const total = parseMoney($('#oc_fondo').val()) + parseMoney($('#oc_comision').val());
    $('#oc_total').val(formatMoney(total));
  }
  $('#oc_fondo, #oc_comision').on('input', ()=>{ recalcGlobal(); saveToStorage(false); });

  // Sustento GLOBAL (simulación archivos múltiples)
  const $dz = $('.dropzone').first();
  const $filesBox = ensure($dz, '#oc_files', '<div id="oc_files" class="file-list mt-2"></div>');
  $('#oc_file').prop('multiple', true); // por si no estaba en el HTML
  $('#oc_file').on('change', function(){
    const files = Array.from(this.files || []);
    if (!files.length) return;
    $('#oc_filename').text('• ' + files[0].name); // nombre principal
    files.map(fileMeta).forEach(m => $filesBox.append(fileChip(m)));
    bindFileChipRemove($dz);
    this.value = '';
    saveToStorage(false);
  });

  // Docs GLOBAL adicionales
  $('#oc_btn_add_doc').on('click', ()=>{
    const $inp = $('#oc_doc_nombre');
    const name = ($inp.val()||'').trim();
    if(!name) return toastr.warning('Escribe un nombre para el documento.');
    addDocChip($('#oc_docs'), name);
    $inp.val('');
    saveToStorage(false);
  });

  // acciones (global)
  $('#btnGenerarCarta').on('click', ()=>{
    saveToStorage();
    toastr.success('Borrador guardado y carta generada (demo)');
  });
  $('#btnCancelar').on('click', ()=> Swal.fire({icon:'info',title:'Acción cancelada',timer:1100,showConfirmButton:false}));

  // Confirmar Operación = guardar todo
  $('#formOperacion').on('submit', function(e){
    e.preventDefault();
    saveToStorage();
    Swal.fire({icon:'success',title:'Operación confirmada (guardada localmente)',timer:1200,showConfirmButton:false});
  });

  // helpers expuestos (opcional)
  window.ocStorage = {
    save: saveToStorage,
    load: loadFromStorage,
    clear: clearStorage
  };
}

/* =====================  RESTORE ===================== */
function restoreFromStorage(){
  const data = loadFromStorage();
  if (!data) return;
  // operacion
  populateOperacion(data.operacion);
  // transferencias
  (data.transferencias || []).forEach(t => addTransferTab(t));
  if (window.toastr) toastr.info('Se restauró un borrador local');
}

/* ============ Locks (vista) ============ */
function lockTransfer($panel){
  // deshabilita todo
  $panel.find('input, select, textarea, button').prop('disabled', true);

  // habilita solo: comisión, file y docs extra
  $panel.find('.trf-comision').prop('disabled', false);
  $panel.find('.trf-file').prop('disabled', false);
  $panel.find('.trf-doc-nombre, .trf-btn-add-doc').prop('disabled', false);

  // select2 refresh
  $panel.find('.sel2').prop('disabled', true).trigger('change.select2');
  $panel.find('.trf-total').prop('readonly', true);
}
function lockGlobal(){
  const $s1 = $('.dashed.card');
  $s1.find('input, select, textarea').prop('disabled', true);
  $s1.find('.sel2').prop('disabled', true).trigger('change.select2');

  $('#oc_fondo').prop('disabled', true);
  $('#oc_total').prop('disabled', true).prop('readonly', true);
  $('#oc_comision').prop('disabled', false);

  $('#oc_file').prop('disabled', false);
  $('#oc_doc_nombre, #oc_btn_add_doc').prop('disabled', false);
}

/* =====================  INIT ===================== */
$(function(){
  initGlobal();
  restoreFromStorage(); // comenta esta línea si NO deseas restauración automática
});
