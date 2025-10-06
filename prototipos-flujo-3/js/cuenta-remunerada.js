// =====================  CONFIG  =====================
const CR_STORAGE_KEY = 'cr_registro_v2';
const CR_STORAGE_VERSION = '2';
const CR_MAX_PDF_MB = 5;

// =====================  MOCK DATA  =====================
const ENTIDADES = [
  { id:'', text:'Seleccione...' },
  { id:'fdo-consolidado', text:'Fondo Consolidado de Reservas Previsionales – FCR' },
  { id:'fcr-macrofondo', text:'FCR-MACROFONDO' }
];
const UNIDADES = [
  { id:'', text:'Seleccione...' },
  { id:'fcr-macrofondo', text:'FCR-MACROFONDO' },
  { id:'tesoreria', text:'TESORERÍA' }
];
const CR_CUENTAS = {
  'fdo-consolidado|fcr-macrofondo': ['001-1234567-0-12', '001-7654321-0-33'],
  'fdo-consolidado|tesoreria'     : ['019-1200345-0-22'],
  'fcr-macrofondo|fcr-macrofondo' : ['019-5554321-0-01']
};

// =====================  STATE =====================
let dineroMask = null;
let sustentoMain = null; // {name,type,size,dataUrl}
let docsAdicionales = []; // [{id, nombre, file:{...}}]

// =====================  HELPERS =====================
function initSelect2($el, data){
  return $el.select2({ data, placeholder:'Seleccione...', width:'100%', allowClear:true });
}
function loadCuentas(entidad, unidad){
  const key = `${entidad||''}|${unidad||''}`;
  const arr = CR_CUENTAS[key] || [];
  const items = [{id:'',text:'Seleccione...'}].concat(arr.map(n => ({id:n, text:n})));
  const $cuenta = $('#cr_cuenta');
  $cuenta.empty().select2({ data: items, placeholder:'Seleccione...', width:'100%', allowClear:true });
}
function attachMoneyMask(){
  if (dineroMask) return;
  dineroMask = new Cleave('#cr_monto', { numeral:true, numeralThousandsGroupStyle:'thousand', numeralDecimalScale:2 });
}
function parseMoney(str){ return Number(String(str||'').replace(/[^\d.-]/g,''))||0; }
function formatMoney(n){ return new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0); }

function getAreaParam(){
  const p = new URLSearchParams(window.location.search);
  return p.get('area');
}

function uid(){ return Math.random().toString(36).slice(2,9); }

// =====================  STORAGE =====================
function serializeCR(){
  return {
    entidad : $('#cr_entidad').val() || '',
    unidad  : $('#cr_unidad').val() || '',
    cuenta  : $('#cr_cuenta').val() || '',
    fecha   : $('#cr_fecha').val() || '',
    monto   : parseMoney($('#cr_monto').val()),
    sustento: sustentoMain ? { name:sustentoMain.name, type:sustentoMain.type, size:sustentoMain.size, dataUrl:sustentoMain.dataUrl } : null,
    docs    : docsAdicionales.map(d => ({
      id:d.id, nombre:d.nombre,
      file: d.file ? { name:d.file.name, type:d.file.type, size:d.file.size, dataUrl:d.file.dataUrl } : null
    }))
  };
}
function saveToStorage(showToast = true){
  try{
    const data = { meta:{ savedAt:new Date().toISOString(), version:CR_STORAGE_VERSION }, registro:serializeCR() };
    localStorage.setItem(CR_STORAGE_KEY, JSON.stringify(data));
    if (showToast && window.toastr) toastr.success('Guardado local');
  }catch(e){
    console.error(e);
    if (window.toastr) toastr.error('No se pudo guardar localmente');
  }
}
function loadFromStorage(){
  try{
    const raw = localStorage.getItem(CR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }catch(e){ return null; }
}
function clearStorage(){ localStorage.removeItem(CR_STORAGE_KEY); if (window.toastr) toastr.info('Borrador eliminado'); }

// =====================  MAIN SUSTENTO =====================
function showMainSustentoInfo(name, size){
  const sizeMb = (size/1024/1024).toFixed(2);
  $('#cr_sustento_info').html(`📄 ${name} <span class="text-slate-500">(${sizeMb} MB)</span> <button id="cr_main_clear" class="ml-2 text-red-600 font-semibold">[quitar]</button>`);
  $('#cr_main_clear').on('click', ()=>{
    sustentoMain = null;
    $('#cr_sustento_file').val('');
    $('#cr_sustento_info').html('');
    saveToStorage(false);
  });
}
function handleMainFile(file){
  if (!file) return;
  if (file.type !== 'application/pdf'){ toastr.error('Solo se permite PDF'); return; }
  const sizeMb = file.size/1024/1024;
  if (sizeMb > CR_MAX_PDF_MB){ toastr.error('El PDF no debe superar ' + CR_MAX_PDF_MB + ' MB'); return; }
  const reader = new FileReader();
  reader.onload = (e)=>{
    sustentoMain = { name:file.name, type:file.type, size:file.size, dataUrl:e.target.result };
    showMainSustentoInfo(file.name, file.size);
    saveToStorage(false);
  };
  reader.readAsDataURL(file);
}
function wireMainDrop(){
  const $drop = $('#cr_main_drop');
  const $file = $('#cr_sustento_file');
  //$drop.on('click', ()=> $file.trigger('click'));
  $file.off('change').on('change', function(){ handleMainFile(this.files[0]); });
  $drop.on('dragover dragenter', function(e){ e.preventDefault(); e.stopPropagation(); $drop.addClass('is-hover'); });
  $drop.on('dragleave dragend drop', function(e){ e.preventDefault(); e.stopPropagation(); $drop.removeClass('is-hover'); });
  $drop.on('drop', function(e){
    const dt = e.originalEvent.dataTransfer;
    if (dt && dt.files && dt.files.length) handleMainFile(dt.files[0]);
  });
}

// =====================  DOCS ADICIONALES =====================
function renderDocs(){
  const $grid = $('#cr_docs_grid').empty();
  docsAdicionales.forEach(doc => {
    const html = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
  <div class="flex items-center justify-between px-3 py-2 border-b border-slate-200">
    <div class="flex items-center gap-2">
      <button data-doc="${doc.id}" class="cr-doc-del w-7 h-7 grid place-content-center bg-red-600 text-white rounded-md">×</button>
      <span class="font-semibold text-slate-700">${doc.nombre}</span>
    </div>
  </div>

  <div class="p-3">
    <!-- Wrapper mantiene data-doc para tus eventos (click/drag&drop) -->
    <div class="tw-drop" data-doc="${doc.id}">
      <!-- MISMO DROPZONE QUE EL PRINCIPAL -->
      <label for="file-${doc.id}"
             class="block w-full border-2 border-dashed border-slate-300 rounded-xl bg-white p-6 text-center cursor-pointer hover:border-blue-400 transition">
        <div class="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
          <span>📄</span>
          <span>Seleccionar archivo</span>
        </div>
        <div class="text-xs text-slate-500">PDF</div>
      </label>

      <!-- input + área de info -->
      <input id="file-${doc.id}" type="file" accept="application/pdf" class="hidden"/>
      <div id="info-${doc.id}" class="text-sm text-slate-700 mt-2"></div>
    </div>
  </div>
</div>

    `;
    $grid.append(html);
  });

  // Bind events for each doc
  $('.cr-doc-del').off('click').on('click', function(){
    const id = $(this).data('doc');
    docsAdicionales = docsAdicionales.filter(d => d.id !== id);
    renderDocs();
    saveToStorage(false);
  });

  /*$('.tw-drop').off('click').on('click', function(){
    const id = $(this).data('doc');
    document.getElementById('file-'+id).click();
  });*/

  $('.tw-drop').off('dragover dragenter').on('dragover dragenter', function(e){
    e.preventDefault(); e.stopPropagation(); $(this).addClass('is-hover');
  });
  $('.tw-drop').off('dragleave dragend drop').on('dragleave dragend drop', function(e){
    e.preventDefault(); e.stopPropagation(); $(this).removeClass('is-hover');
  });
  $('.tw-drop').off('drop').on('drop', function(e){
    const id = $(this).data('doc');
    const dt = e.originalEvent.dataTransfer;
    if (dt && dt.files && dt.files.length){ handleDocFile(id, dt.files[0]); }
  });

  $('[id^=file-]').off('change').on('change', function(){
    const id = this.id.replace('file-','');
    handleDocFile(id, this.files[0]);
  });

  // Populate existing files info
  docsAdicionales.forEach(d => {
    if (d.file){
      const sizeMb = (d.file.size/1024/1024).toFixed(2);
      $('#info-'+d.id).html(`📄 ${d.file.name} <span class="text-slate-500">(${sizeMb} MB)</span> <button data-doc="${d.id}" class="cr-doc-clear ml-2 text-red-600 font-semibold">[quitar]</button>`);
    }
  });
  $('.cr-doc-clear').off('click').on('click', function(){
    const id = $(this).data('doc');
    const doc = docsAdicionales.find(x => x.id === id);
    if (doc){ doc.file = null; $('#info-'+id).html(''); saveToStorage(false); }
  });
}
function handleDocFile(id, file){
  if (!file) return;
  if (file.type !== 'application/pdf'){ toastr.error('Solo PDF'); return; }
  const sizeMb = file.size/1024/1024;
  if (sizeMb > CR_MAX_PDF_MB){ toastr.error('Máximo ' + CR_MAX_PDF_MB + ' MB'); return; }
  const reader = new FileReader();
  reader.onload = (e)=>{
    const doc = docsAdicionales.find(d => d.id === id);
    if (doc){
      doc.file = { name:file.name, type:file.type, size:file.size, dataUrl:e.target.result };
      const sizeMb2 = (file.size/1024/1024).toFixed(2);
      $('#info-'+id).html(`📄 ${file.name} <span class="text-slate-500">(${sizeMb2} MB)</span> <button data-doc="${id}" class="cr-doc-clear ml-2 text-red-600 font-semibold">[quitar]</button>`);
      $('.cr-doc-clear').off('click').on('click', function(){
        const id2 = $(this).data('doc');
        const doc2 = docsAdicionales.find(x => x.id === id2);
        if (doc2){ doc2.file = null; $('#info-'+id2).html(''); saveToStorage(false); }
      });
      saveToStorage(false);
    }
  };
  reader.readAsDataURL(file);
}

// =====================  INIT =====================
$(function(){
  // Area badge
  const area = getAreaParam();
  if (area) $('#area-badge').text('Perfil: ' + area);

  // Toastr
  toastr.options = { closeButton:true,newestOnTop:true,progressBar:true,positionClass:'toast-top-right',timeOut:2200 };

  // Select2
  initSelect2($('#cr_entidad'), ENTIDADES);
  initSelect2($('#cr_unidad'), UNIDADES);
  initSelect2($('#cr_cuenta'), [{id:'',text:'Seleccione...'}]);

  // Dependencias para cuentas
  $('#cr_entidad, #cr_unidad').on('change', function(){
    loadCuentas($('#cr_entidad').val(), $('#cr_unidad').val());
    saveToStorage(false);
  });
  $('#cr_cuenta').on('change', ()=> saveToStorage(false));

  // Monto
  attachMoneyMask();
  $('#cr_monto').on('input', ()=> saveToStorage(false));

  // Fecha
  $('#cr_fecha').on('change', ()=> saveToStorage(false));

  // Main drop
  wireMainDrop();

  // Add doc
  $('#cr_btn_add_doc').on('click', function(){
    const name = ($('#cr_new_doc_name').val() || '').trim();
    if (!name){ toastr.error('Ingrese un nombre de documento'); return; }
    docsAdicionales.push({ id: uid(), nombre: name, file: null });
    $('#cr_new_doc_name').val('');
    renderDocs();
    saveToStorage(false);
  });

  // Limpiar
  $('#cr_btn_limpiar').on('click', function(){
    $('#cr_entidad').val('').trigger('change');
    $('#cr_unidad').val('').trigger('change');
    loadCuentas('', '');
    $('#cr_cuenta').val('').trigger('change');
    $('#cr_fecha').val('');
    $('#cr_monto').val('');
    // main sustento
    sustentoMain = null; $('#cr_sustento_file').val(''); $('#cr_sustento_info').html('');
    // docs
    docsAdicionales = []; renderDocs();
    clearStorage();
  });

  // Guardar
  $('#cr_form').on('submit', function(e){
    e.preventDefault();
    const d = serializeCR();
    if(!d.entidad || !d.unidad || !d.cuenta || !d.fecha || !d.monto){
      toastr.error('Completa todos los campos obligatorios');
      return;
    }
    saveToStorage();
    Swal.fire({icon:'success',title:'Registro guardado localmente',timer:1200,showConfirmButton:false});
  });

  // Restore
  const data = loadFromStorage();
  if (data && data.registro){
    const r = data.registro;
    $('#cr_entidad').val(r.entidad).trigger('change');
    $('#cr_unidad').val(r.unidad).trigger('change');
    loadCuentas(r.entidad, r.unidad);
    $('#cr_cuenta').val(r.cuenta).trigger('change');
    if (r.fecha) $('#cr_fecha').val(r.fecha);
    if (r.monto) $('#cr_monto').val(formatMoney(r.monto));
    if (r.sustento){ sustentoMain = r.sustento; showMainSustentoInfo(r.sustento.name, r.sustento.size); }
    docsAdicionales = (r.docs || []).map(d => ({ id:d.id || uid(), nombre:d.nombre, file:d.file || null }));
    renderDocs();
    toastr.info('Se restauró un borrador local');
  }
});
