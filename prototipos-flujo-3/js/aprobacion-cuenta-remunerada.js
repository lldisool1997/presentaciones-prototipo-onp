// ===================== Config =====================
const REG_STORAGE_KEY = 'cr_registro_v2';   // registro previo
const APR_STORAGE_KEY = 'cr_aprobacion_v1'; // nuevos adjuntos en aprobación
const MAX_PDF_MB = 5;

// ===================== State =====================
let aprobSustento = null;      // {name,type,size,dataUrl}
let aprobDocs = [];            // [{id, nombre, file:{...}}]

// ===================== Helpers =====================
function fmtMoney(n){ return new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0); }
function bytesToMB(n){ return (n/1024/1024).toFixed(2); }
function uid(){ return Math.random().toString(36).slice(2,9); }
function loadJSON(key){ try{ const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }catch{ return null; } }
function saveJSON(key, obj){ localStorage.setItem(key, JSON.stringify(obj)); }

// ===================== Render readonly data =====================
function renderReadonly(reg){
  const r = reg?.registro || {};
  $('#ap_entidad').val(mapEntidad(r.entidad));
  $('#ap_unidad').val(mapUnidad(r.unidad));
  $('#ap_cuenta').val(r.cuenta || '');
  $('#ap_fecha').val(r.fecha || '');
  $('#ap_monto').val(r.monto ? fmtMoney(r.monto) : '');

  // principal
  const sust = r.sustento;
  const $badge = $('#ap_sustento_badge');
  const $block = $('#ap_sustento_block').empty();
  if (sust?.dataUrl){
    $badge.text('Adjuntado').removeClass().addClass('text-xs rounded-full px-2 py-1 bg-green-100 text-green-700');
    $block.append(`
      <div class="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
        <div class="text-slate-700">📄 <b>${sust.name}</b> <span class="text-slate-500">(${bytesToMB(sust.size)} MB)</span></div>
        <a href="${sust.dataUrl}" download="${sust.name}" target="_blank"
           class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-md">Descargar</a>
      </div>
    `);
  }else{
    $badge.text('Sin archivo').removeClass().addClass('text-xs rounded-full px-2 py-1 bg-slate-200 text-slate-700');
    $block.append(`<div class="text-slate-500">No se adjuntó un sustento en el registro.</div>`);
  }

  // adicionales del registro
  const $grid = $('#ap_docs_reg_grid').empty();
  (r.docs || []).forEach(d => {
    const has = !!d.file?.dataUrl;
    $grid.append(`
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between px-3 py-2 border-b border-slate-200">
          <div class="font-semibold text-slate-700">${d.nombre}</div>
          <span class="text-xs ${has ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'} rounded-full px-2 py-1">
            ${has ? 'Adjuntado' : 'Sin archivo'}
          </span>
        </div>
        <div class="p-3">
          ${has ? `
            <div class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div class="text-slate-700">📄 <b>${d.file.name}</b> <span class="text-slate-500">(${bytesToMB(d.file.size)} MB)</span></div>
              <a href="${d.file.dataUrl}" download="${d.file.name}" target="_blank"
                 class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-md">Descargar</a>
            </div>
          ` : `<div class="text-slate-500">No se adjuntó archivo en el registro.</div>`}
        </div>
      </div>
    `);
  });
}

// map helpers (simple pretty text)
function mapEntidad(id){
  if (id === 'fdo-consolidado') return 'Fondo Consolidado de Reservas Previsionales – FCR';
  if (id === 'fcr-macrofondo') return 'FCR-MACROFONDO';
  return id || '';
}
function mapUnidad(id){
  if (id === 'fcr-macrofondo') return 'FCR-MACROFONDO';
  if (id === 'tesoreria') return 'TESORERÍA';
  return id || '';
}

// ===================== Aprobación: nuevos sustentos =====================
function showAprobMainInfo(name, size){
  $('#ap_sustento_info').html(`📄 ${name} <span class="text-slate-500">(${bytesToMB(size)} MB)</span> <button id="ap_main_clear" class="ml-2 text-red-600 font-semibold">[quitar]</button>`);
  $('#ap_main_clear').on('click', ()=>{
    aprobSustento = null;
    $('#ap_sustento_file').val('');
    $('#ap_sustento_info').html('');
    saveApproval(false);
  });
}
function handleAprobMain(file){
  if (!file) return;
  if (file.type !== 'application/pdf'){ toastr.error('Solo PDF'); return; }
  if (file.size/1024/1024 > MAX_PDF_MB){ toastr.error('Máximo '+MAX_PDF_MB+' MB'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    aprobSustento = { name:file.name, type:file.type, size:file.size, dataUrl:e.target.result };
    showAprobMainInfo(file.name, file.size);
    saveApproval(false);
  };
  reader.readAsDataURL(file);
}
function wireAprobMainDrop(){
  $('#ap_sustento_file').off('change').on('change', function(){ handleAprobMain(this.files[0]); });
}

// docs adicionales (aprobación)
function renderAprobDocs(){
  const $grid = $('#ap_docs_grid').empty();
  aprobDocs.forEach(doc => {
    $grid.append(`
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div class="flex items-center justify-between px-3 py-2 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <button data-doc="${doc.id}" class="ap-doc-del w-7 h-7 grid place-content-center bg-red-600 text-white rounded-md">×</button>
            <span class="font-semibold text-slate-700">${doc.nombre}</span>
          </div>
        </div>
        <div class="p-3">
          <label for="apfile-${doc.id}"
                 class="block w-full border-2 border-dashed border-slate-300 rounded-xl bg-white p-6 text-center cursor-pointer hover:border-blue-400 transition">
            <div class="flex items-center justify-center gap-2 text-sm font-medium text-slate-700">
              <span>📄</span><span>Seleccionar archivo</span>
            </div>
            <div class="text-xs text-slate-500">PDF</div>
          </label>
          <input id="apfile-${doc.id}" type="file" accept="application/pdf" class="hidden"/>
          <div id="apinfo-${doc.id}" class="text-sm text-slate-700 mt-2"></div>
        </div>
      </div>
    `);
  });

  $('.ap-doc-del').off('click').on('click', function(){
    const id = $(this).data('doc');
    aprobDocs = aprobDocs.filter(d => d.id !== id);
    renderAprobDocs(); saveApproval(false);
  });
  $('[id^=apfile-]').off('change').on('change', function(){
    const id = this.id.replace('apfile-','');
    const file = this.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf'){ toastr.error('Solo PDF'); return; }
    if (file.size/1024/1024 > MAX_PDF_MB){ toastr.error('Máximo '+MAX_PDF_MB+' MB'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      const doc = aprobDocs.find(d => d.id === id);
      if (doc){
        doc.file = { name:file.name, type:file.type, size:file.size, dataUrl:e.target.result };
        $('#apinfo-'+id).html(`📄 ${file.name} <span class="text-slate-500">(${bytesToMB(file.size)} MB)</span> <button data-doc="${id}" class="ap-doc-clear ml-2 text-red-600 font-semibold">[quitar]</button>`);
        $('.ap-doc-clear').off('click').on('click', function(){
          const id2 = $(this).data('doc');
          const d2 = aprobDocs.find(x => x.id === id2);
          if (d2){ d2.file = null; $('#apinfo-'+id2).html(''); saveApproval(false); }
        });
        saveApproval(false);
      }
    };
    reader.readAsDataURL(file);
  });
}

// ===================== Storage (aprobación) =====================
function serializeApproval(){
  return {
    main : aprobSustento ? { ...aprobSustento } : null,
    docs : aprobDocs.map(d => ({ id:d.id, nombre:d.nombre, file:d.file ? {...d.file} : null })),
    meta : { savedAt:new Date().toISOString() }
  };
}
function saveApproval(showToast = true){
  saveJSON(APR_STORAGE_KEY, serializeApproval());
  if (showToast) toastr.success('Guardado local');
}
function loadApproval(){
  return loadJSON(APR_STORAGE_KEY);
}
function clearApproval(){
  localStorage.removeItem(APR_STORAGE_KEY);
  if (window.toastr) toastr.info('Borrador de aprobación eliminado');
}

// ===================== Init =====================
$(function(){
  toastr.options = { closeButton:true,newestOnTop:true,progressBar:true,positionClass:'toast-top-right',timeOut:2200 };

  // cargar registro previo
  const reg = loadJSON(REG_STORAGE_KEY);
  renderReadonly(reg);

  // wire main approval file
  wireAprobMainDrop();

  // add doc
  $('#ap_btn_add_doc').on('click', function(){
    const name = ($('#ap_new_doc_name').val() || '').trim();
    if (!name){ toastr.error('Ingrese un nombre de documento'); return; }
    aprobDocs.push({ id: uid(), nombre: name, file: null });
    $('#ap_new_doc_name').val('');
    renderAprobDocs(); saveApproval(false);
  });

  // botones
  $('#ap_btn_limpiar').on('click', function(){
    aprobSustento = null; $('#ap_sustento_file').val(''); $('#ap_sustento_info').html('');
    aprobDocs = []; renderAprobDocs();
    clearApproval();
  });
  $('#ap_btn_guardar').on('click', function(){
    saveApproval(true);
    Swal.fire({icon:'success',title:'Aprobación guardada localmente',timer:1200,showConfirmButton:false});
  });

  // restore approval draft (if any)
  const apr = loadApproval();
  if (apr){
    if (apr.main){
      aprobSustento = apr.main;
      showAprobMainInfo(apr.main.name, apr.main.size);
    }
    aprobDocs = (apr.docs || []).map(d => ({ id:d.id, nombre:d.nombre, file:d.file || null }));
    renderAprobDocs();
    toastr.info('Se restauró un borrador de aprobación');
  }
});
