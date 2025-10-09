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

// ====== ESTADO + CHECK EN TABS ======
const ESTADOS_OK = new Set(['confirmado','registrado','enviado','aprobado', 'instruido']);

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
    $('#btnAddTransferencia').addClass('hidden');
    $('input, select').prop("disabled", true)
    
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
      $panel.find('.btnEliminarTransferencia').addClass('hidden');
      $panel.find('input, select').prop("disabled", true)
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
      <section id="${secId}" class="mt-6 p-4 border rounded-lg bg-white shadow">
        <h2 class="text-lg font-semibold text-gray-800 mb-2">📄 Última carta generada</h2>
        <p class="text-sm text-gray-600">
          Fecha y hora:
          <span id="${spanId}" class="font-medium text-gray-900">--/--/---- --:--</span>
        </p>
      </section>
    `);
  }
  $anchorSubsection.find(`#${spanId}`).text(formatFechaLima(isoTs));
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


// arriba, junto a tus globals
let IS_RESTORING = false;


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
function serializeOperacion(){
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
    fecha           : $('#oc_fecha').val()
  };
}
function serializeTransfer($panel){
  return {
    moneda       : $panel.find('.sel-moneda').val(),
    monto        : parseMoney($panel.find('.txt-monto').val()),
    banco_cargo  : $panel.find('.sel-banco-cargo').val(),
    cuenta_cargo : $panel.find('.sel-cuenta-cargo').val(),
    banco_destino: $panel.find('.sel-banco-destino').val(),
    cuenta_destino: $panel.find('.sel-cuenta-destino').val()
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
}
function populateTransfer($panel, t){
  if (!t) return;
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
  // antes: saveToStorage(false);
if (!IS_RESTORING) saveToStorage(false);   // <- NO guardes mientras restauras
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
    setEstado('transferencia', $panel.attr('id'), 'instruido'); // estado + check en su tab
    Swal.fire({icon:'success',title:'Transferencia confirmada',timer:1200,showConfirmButton:false});
  });
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

  // acciones (global)
  $('#btnGenerarCarta').on('click', ()=>{
    saveToStorage();
    toastr.success('Borrador guardado y carta generada (demo)');
  });
  $('#btnCancelar').on('click', ()=> Swal.fire({icon:'info',title:'Acción cancelada',timer:1100,showConfirmButton:false}));

  // Confirmar Operación = guardar todo
  $('#formOperacion').on('submit', function(e){
    e.preventDefault();

    if(!todasTransferenciasInstruidas()){
      toastr.warning("Todas las transferencias deben estar aprobadas.");
      return false;
    }

    saveToStorage();
    setEstado('operacion', 'tab-operacion', 'instruido'); // marca estado + check
    Swal.fire({icon:'success',title:'Operación confirmada',timer:1200,showConfirmButton:false});
  });

  $('#oc_importe_origen, #oc_tipo_cambio').on('change', function(e){
    const importe = $('#oc_importe_origen').val();
    const tipoCambio = $('#oc_tipo_cambio').val();

    if(importe && tipoCambio){
      $('#oc_importe_destino').val(formatMoney(parseMoney(importe)/parseMoney(tipoCambio)))
    }
  })

  // helpers expuestos (opcional)
  window.ocStorage = {
    save: saveToStorage,
    load: loadFromStorage,
    clear: clearStorage
  };
}

/* =====================  RESTORE ===================== */
// en restoreFromStorage()
function restoreFromStorage(){
  const data = loadFromStorage();
  if (!data) return;

  IS_RESTORING = true;                 // <- activa el modo restauración
  populateOperacion(data.operacion);
  (data.transferencias || []).forEach(t => addTransferTab(t));
  IS_RESTORING = false;                // <- desactívalo
    applyEstadoBadges(data); // <<< pinta checks según estados guardados

  if (window.toastr) toastr.info('Se restauró un borrador local');
}


/* =====================  INIT ===================== */
$(function(){
  initGlobal();
  restoreFromStorage(); // comenta esta línea si NO deseas restauración automática
               function getAreaParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("area");
  }

  const area = getAreaParam();
  if (area) {
    document.getElementById("area-badge").textContent = "Perfil: " + area;
  }

});

/**
 * Retorna true si todas las transferencias del snapshot están en estado "INSTRUIDO".
 * Retorna false si hay al menos una transferencia con otro estado.
 */
function todasTransferenciasInstruidas() {
  const KEY = STORAGE_KEY;
  const snap = JSON.parse(localStorage.getItem(KEY) || "[]");

  const trfs = Array.isArray(snap.transferencias) ? snap.transferencias : [];
  if (trfs.length === 0) return true; // si no hay transferencias, consideramos que está todo listo

  // revisa si TODAS están en INSTRUIDO
  return trfs.every(t => (t.estado || "").trim() === "instruido");
}
