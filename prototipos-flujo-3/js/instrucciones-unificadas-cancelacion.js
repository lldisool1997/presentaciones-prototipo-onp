
/* ======================================================
   Instrucciones Unificadas (tabs + dinámicos fondeo)
   - Basado en los flujos existentes del usuario
   ====================================================== */

// Datos mock (ajusta a tus reales)
const selectedInvestment = {
  id: "INV-6120",
  entidad: "Fondo Consolidado de Reservas Previsionales – FCR",
  descripcion: "Inversión de Prueba"
};

const BANCOS = [
  { id: "BCP", text: "Banco de Crédito del Perú (BCP)" },
  { id: "Scotiabank", text: "Scotiabank Perú" },
  { id: "BBVA", text: "BBVA Perú" },
  { id: "Interbank", text: "Interbank" }
];

const CUENTAS_BANCARIAS = [
  { id: "BCP-PEN-001", banco: "BCP", text: "193-1990153-0-54" },
  { id: "SCOTIA-PEN-002", banco: "Scotiabank", text: "970-0700108" },
  { id: "BBVA-PEN-003", banco: "BBVA", text: "0011-0661-02-00040907" },
  { id: "INTERBANK-PEN-004", banco: "Interbank", text: "200-3067561380" }
];

// Estado por panel
const filesUploadedByPanel = {};   // panelId -> { fieldId: boolean }
const docCounterByPanel = {};      // panelId -> incremental

function markInvalid($el){ $el.addClass("ring-2 ring-red-400 border-red-400"); }
function clearInvalid($el){ $el.removeClass("ring-2 ring-red-400 border-red-400"); }

function validatePdf(file){
  if(!file) return { ok:false, msg:"Adjunta el documento (PDF)." };
  const okExt = /\.pdf$/i.test(file.name || "");
  if(!okExt) return { ok:false, msg:"Formato no permitido. Solo PDF." };
  if(file.size > 10*1024*1024) return { ok:false, msg:"Archivo supera 10MB. Adjunta uno más liviano." };
  return { ok:true };
}

// Inicialización de Select2 para un combo de banco+cuenta
function initBancoCuenta($banco, $cuenta){
  $banco.select2({ data: BANCOS, placeholder:"Selecciona un banco...", allowClear:true, width:"100%" });
  $cuenta.select2({ placeholder:"Selecciona una cuenta...", allowClear:true, width:"100%" });

  $banco.off("change.init").on("change.init", function(){
    const bancoSel = $(this).val();
    const cuentas = CUENTAS_BANCARIAS.filter(c => c.banco === bancoSel);
    $cuenta.empty().select2({ data: cuentas, placeholder:"Selecciona una cuenta...", allowClear:true, width:"100%" });
  });
}

// Crear campo de documento dinámico dentro de un panel
function createDocumentField(panelId, docName, isCustom=false){
  const $panel = $("#"+panelId);
  const $container = $panel.find(".documentFields, #documentFields_base");
  const idx = (docCounterByPanel[panelId] = (docCounterByPanel[panelId] || 0) + 1);
  const fieldId = `${panelId}_doc_${idx}`;

  const $group = $([
    '<div class="file-upload-group p-3 rounded-xl w-[320px]" id="field_'+fieldId+'">',
    '  <div class="flex items-center mb-2 text-left gap-3">',
    '    <label class="font-semibold">'+docName+'</label>',
    (isCustom ? '    <button type="button" class="remove-btn" data-field="'+fieldId+'">✕</button>' : ''),
    '  </div>',
    '  <div class="file-upload-area text-center rounded-sm border-2 border-dashed border-gray-300 bg-muted p-4 cursor-pointer hover:border-blue-400 transition-colors">',
    '    <div class="upload-text font-medium">📄 Seleccionar archivo</div>',
    '    <div class="upload-text text-gray-500 text-sm mt-1">PDF</div>',
    '  </div>',
    '  <input type="file" style="display:none" accept=".pdf" class="file-dyn" data-field="'+fieldId+'">',
    '</div>'
  ].join(""));
  $container.append($group);

  filesUploadedByPanel[panelId] = filesUploadedByPanel[panelId] || {};
  filesUploadedByPanel[panelId][fieldId] = false;
}

// Bind delegados comunes a toda la página (una sola vez)
function bindDelegatesOnce(){
  if (window.__unifiedBinds) return;
  window.__unifiedBinds = true;

  // Abrir input de file de cada uploader dinámico
  $(document).on("click", ".file-upload-area", function(e){
    if (e.target.closest('.remove-btn')) return;
    const $input = $(this).siblings('input[type="file"]');
    $input.trigger("click");
  });

  // Cambio de archivo en dinámicos
  $(document).on("change", ".file-dyn", function(){
    const panelId = $(this).closest(".tab-panel").attr("id");
    const fileArea = $(this).siblings(".file-upload-area");
    const fieldId  = $(this).data("field");
    const file     = this.files[0];
    const v = validatePdf(file);
    if(!v.ok){
      this.value = "";
      filesUploadedByPanel[panelId][fieldId] = false;
      $(fileArea).addClass('ring-2 ring-red-400 border-red-400')
                 .html('<div class="upload-text text-red-600">⌫ '+v.msg+'</div><div class="upload-text text-gray-500 text-sm mt-1">PDF</div>');
      return;
    }
    filesUploadedByPanel[panelId][fieldId] = true;
    $(fileArea).removeClass('ring-2 ring-red-400 border-red-400')
               .html('<div class="file-name">📎 '+file.name+'</div><div class="upload-text text-green-600 text-sm">Archivo cargado correctamente</div>');
    checkFormCompletion(panelId);
  });

  // Remover documento dinámico
  $(document).on("click", ".remove-btn", function(){
    const fieldId = $(this).data("field");
    const $group = $("#field_"+fieldId);
    const panelId = $(this).closest(".tab-panel").attr("id");
    if ($group.length){ $group.remove(); }
    if (filesUploadedByPanel[panelId]) delete filesUploadedByPanel[panelId][fieldId];
    checkFormCompletion(panelId);
  });

  // Add-document (delegado)
  $(document).on("click", ".add-document-btn", function(){
    const $panel = $(this).closest(".tab-panel");
    const panelId = $panel.attr("id");
    const $input = $panel.find(".newDocumentName");
    const isBase = $(this).data("target")==="base";
    const $inputBase = $("#newDocumentName_base");

    if (isBase){
      const name = ($inputBase.val()||"").trim();
      if(!name){ toastr.warning("Ingresa un nombre para el documento."); return; }
      createDocumentField("tab-instruir", name, true);
      $inputBase.val("");
    }else{
      const name = ($input.val()||"").trim();
      if(!name){ toastr.warning("Ingresa un nombre para el documento."); return; }
      createDocumentField(panelId, name, true);
      $input.val("");
    }
  });

  // Drop principal per panel
  $(document).on("click", ".drop", function(e){
    const $panel = $(this).closest(".tab-panel");
    $panel.find(".file")[0]?.click();
  });

  $(document).on("change", ".file", function(){
    const $panel = $(this).closest(".tab-panel");
    const $drop = $panel.find(".drop");
    const $fileName = $panel.find(".fileName");
    const f = this.files[0];
    const v = validatePdf(f);
    if(!v.ok){
      this.value = "";
      $fileName.addClass("hidden").text("");
      markInvalid($drop);
      toastr.error(v.msg);
      $drop.find(".font-semibold").text("📄 Seleccionar archivo");
      $drop.find(".text-gray-500").text("PDF");
      return;
    }
    clearInvalid($drop);
    $fileName.removeClass("hidden").text(f.name);
    toastr.success("Documento adjuntado.");
  });

  // Tabs switch
  $(document).on("click", ".tab-link", function(e){
    e.preventDefault();
    $(".tab-link").removeClass("active");
    $(this).addClass("active");
    const target = $(this).attr("href");
    $(".tab-panel").addClass("hidden");
    $(target).removeClass("hidden");
  });
}

// Habilitar/deshabilitar submit según adjuntos del panel
function checkFormCompletion(panelId){
  const $panel = $("#"+panelId);
  const $submit = $panel.find('button[type="submit"]');
  const map = filesUploadedByPanel[panelId] || {};
  const keys = Object.keys(map);
  if (!keys.length){ $submit.prop("disabled", false); return; }
  const ok = keys.every(k => !!map[k]);
  $submit.prop("disabled", !ok);
}

// Inicializar el panel base (Instruir)
function initBasePanel(){
  // Select2
  initBancoCuenta($("#banco_destino_base"), $("#cuenta_destino_base"));

  // Crear contenedor documentos base y dos ejemplos
  //createDocumentField("tab-instruir", "Carta de instrucción (PDF)");
  //createDocumentField("tab-instruir", "Constancia de custodia (PDF)");

  // Drop base
 // AHORA: evita burbujeo y dispara un click nativo sin bubbles
$("#drop_base").off(".mainDrop").on("click.mainDrop", function (e) {
  e.preventDefault();
  e.stopPropagation();

  const input = document.getElementById("file_base");
  if (input) {
    input.dispatchEvent(new MouseEvent("click", { bubbles: false, cancelable: true, view: window }));
  }
});
$("#file_base").off("change.mainDrop").on("change.mainDrop", function (e) {
  e.stopPropagation();

  const f = this.files[0];
  const v = validatePdf(f);
  if (!v.ok) {
    this.value = "";
    $("#fileName_base").addClass("hidden").text("");
    markInvalid($("#drop_base"));
    toastr.error(v.msg);
    $("#drop_base .font-semibold").text("📄 Seleccionar archivo");
    $("#drop_base .text-gray-500").text("PDF");
    return;
  }
  clearInvalid($("#drop_base"));
  $("#fileName_base").removeClass("hidden").text(f.name);
  toastr.success("Documento adjuntado.");
});

  // Submit base
  $("#formLlamado_base").on("submit", function(e){
    e.preventDefault();
    Swal.fire({
      title: "¿Confirmar instrucción?",
      text: "Se registrará la instrucción del instrumento.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, instruir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280"
    }).then(res => {
      if (!res.isConfirmed) return;
      Swal.fire({ icon:"success", title:"¡Instrucción registrada!", confirmButtonColor:"#16a34a" });
      aprobacion_inst_corto_plazo_upsert();
    });
  });
}

// Agregar tab de Fondeo
let fondeoCount = 0;
function addFondeoTab(){
  fondeoCount++;
  const panelId = `tab-fondeo-${fondeoCount}`;

  // Tab header
  $("#tabs").append(`<li class="mr-2"><a href="#${panelId}" class="tab-link">Transferencia Bancaria ${fondeoCount}</a></li>`);

  // Panel (clonado del template)
  const $tpl = $($("#tpl-fondeo").html());
  $tpl.attr("id", panelId);
  $tpl.find(".section-header").text(`2. Transferencia a banco #${fondeoCount}`);
  $("#panels").append($tpl);

  // Init select2 para los cuatro combos del panel
  const $panel = $("#"+panelId);
  initBancoCuenta($panel.find(".banco"), $panel.find(".cuenta"));
  initBancoCuenta($panel.find(".banco_destino"), $panel.find(".cuenta_destino"));

  // Formateo de monto
  new Cleave($panel.find(".monto")[0], {
    numeral: true,
    numeralThousandsGroupStyle: 'thousand',
    numeralDecimalMark: '.',
    delimiter: ','
  });

  // Crear un documento requerido por defecto
  filesUploadedByPanel[panelId] = {};
  //createDocumentField(panelId, "Voucher de transferencia (PDF)");

  // Submit de este panel
  $panel.find("form.fondeo-form").on("submit", function(e){
    e.preventDefault();
    const montoStr = ($panel.find(".monto").val() || "").trim();
    const montoNum = parseFloat(montoStr.replace(/,/g,""));
    if(!montoStr || isNaN(montoNum)){
      markInvalid($panel.find(".monto"));
      toastr.warning("Monto inválido. Usa formato 1,234.56");
      $panel.find(".monto").focus();
      return;
    }
    Swal.fire({
      title: "¿Confirmar fondeo?",
      text: "Se registrará la operación de fondeo.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, guardar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280"
    }).then(res => {
      if (!res.isConfirmed) return;
      Swal.fire({ icon:"success", title:"Transferencia registrada", confirmButtonColor:"#16a34a" });
      aprobacion_inst_corto_plazo_upsert();
    });
  });

  // Activar el tab nuevo
  $(`#tabs a[href="#${panelId}"]`).trigger("click");
}

// =============== Helpers de snapshot ===============
function __getSelectText($sel){
  // Soporta select2 o <select> nativo
  const opt = $sel.find("option:selected");
  return (opt && opt.length) ? (opt.text() || null) : ($sel.val() || null);
}

function __collectDynamicDocs($scope){
  // Documentos dinámicos (inputs .file-dyn agregados con "Agregar Documento")
  const docs = [];
  $scope.find('input.file-dyn').each(function(){
    const f = this.files && this.files[0] ? this.files[0].name : null;
    if (f) docs.push(f);
  });
  return docs;
}

function __collectDropDoc($scope){
  // Documento principal del drop (clase .file + .fileName en fondeo; #file_base en instruir)
  const $file = $scope.find('input.file').first();
  if ($file.length && $file[0].files && $file[0].files[0]) {
    return $file[0].files[0].name;
  }
  const txt = $scope.find('.fileName').first().text().trim();
  return txt || null;
}

function __parseMontoToNumber(montoStr){
  if(!montoStr) return null;
  const n = parseFloat(String(montoStr).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// =============== Snapshot + persistencia ===============
function build_aprobacion_snapshot(){
  // ID/código de la inversión (preferir hidden, si no usar el visible "INV-7000")
  const opId = $("#inv_id_base").val() || $(".info-value").first().text().trim(); // INV-xxxx
  const codigoInversion = $(".info-value").first().text().trim();                 // Visual en cabecera

  // -------- Operación principal (tab-instruir) --------
  const $base = $("#tab-instruir");
  const base = {
    tipo: "operacion_principal",
    opId,
    codigoInversion,
    bancoDestinoId: $("#banco_destino_base").val() || null,
    bancoDestinoTxt: __getSelectText($("#banco_destino_base")),
    cuentaDestinoId: $("#cuenta_destino_base").val() || null,
    cuentaDestinoTxt: __getSelectText($("#cuenta_destino_base")),
    documentoPrincipal: __collectBaseDropDoc(),
    documentosAdicionales: __collectDynamicDocs($base),
  };

  // -------- Transferencias (todas las .fondeo-form existentes) --------
  const transferencias = [];
  $(".tab-panel[id^='tab-fondeo-']").each(function(i, panel){
    const $p = $(panel);
    const $form = $p.find("form.fondeo-form");
    if(!$form.length) return;

    const moneda = $p.find(".moneda").val() || null;
    const montoStr = ($p.find(".monto").val() || "").trim();
    const transfer = {
      tipo: "transferencia",
      idx: i + 1,
      moneda,
      monto: __parseMontoToNumber(montoStr),
      montoRaw: montoStr || null,
      bancoCargoId: $p.find(".banco").val() || null,
      bancoCargoTxt: __getSelectText($p.find(".banco")),
      cuentaCargoId: $p.find(".cuenta").val() || null,
      cuentaCargoTxt: __getSelectText($p.find(".cuenta")),
      bancoDestinoId: $p.find(".banco_destino").val() || null,
      bancoDestinoTxt: __getSelectText($p.find(".banco_destino")),
      cuentaDestinoId: $p.find(".cuenta_destino").val() || null,
      cuentaDestinoTxt: __getSelectText($p.find(".cuenta_destino")),
      documentoPrincipal: __collectDropDoc($p),
      documentosAdicionales: __collectDynamicDocs($p),
    };
    transferencias.push(transfer);
  });

  return {
    opId,
    timestamp: new Date().toISOString(),
    base,
    transferencias
  };
}

/**
 * Guardar en localStorage SOLO si no existe (carga inicial).
 * Key: "aprobacion_inst_corto_plazo"
 */
function aprobacion_inst_corto_plazo(){
  try {
    const KEY = "cancelacion_inst_corto_plazo";
    const snap = build_aprobacion_snapshot();

    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { lista = []; }

    // ¿Ya existe un item con este opId?
    const yaExiste = lista.some(x => x && x.opId === snap.opId);

    if (!yaExiste) {
      lista.push(snap);
      localStorage.setItem(KEY, JSON.stringify(lista));
      console.log(`[aprobación][init] snapshot creado (${snap.opId}).`);
    } else {
      console.log(`[aprobación][init] existe, no se sobrescribe (${snap.opId}).`);
    }
  } catch (err) {
    console.error("Error guardando carga inicial en localStorage:", err);
  }
}

/**
 * Upsert del snapshot: si no existe lo crea, si existe lo reemplaza (manteniendo created_at).
 * Key: "aprobacion_inst_corto_plazo"
 */
function aprobacion_inst_corto_plazo_upsert() {
  try {
    const KEY = "cancelacion_inst_corto_plazo";
    const snap = build_aprobacion_snapshot();

    let lista = [];
    try { lista = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { lista = []; }

    const idx = lista.findIndex(x => x && x.opId === snap.opId);
    const now = new Date().toISOString();

    if (idx === -1) {
      // No existía: lo creamos (carga inicial con created_at)
      lista.push({ ...snap, created_at: now, updated_at: now });
      console.log(`[aprobación][upsert] creado (${snap.opId}).`);
    } else {
      // Ya existía: reemplazamos con el snapshot nuevo, conservando created_at
      const created = lista[idx]?.created_at || now;
      lista[idx] = { ...snap, created_at: created, updated_at: now };
      console.log(`[aprobación][upsert] actualizado (${snap.opId}).`);
    }

    localStorage.setItem(KEY, JSON.stringify(lista));
  } catch (err) {
    console.error("Error en upsert de localStorage:", err);
  }
}



// Ready
$(function(){
  // Toastr cfg
  toastr.options = { positionClass:"toast-top-right", timeOut:2500, progressBar:true };

  bindDelegatesOnce();
  initBasePanel();
  // Carga inicial: guardar operación principal + transferencias existentes (si no existe aún)
  aprobacion_inst_corto_plazo();

  // 1) Identificamos la inversión mostrada en pantalla
  const __opId = $("#inv_id_base").val() || $(".info-value").first().text().trim(); // ej. "INV-7000"

  // 2) Intentamos leer y pintar la data guardada (si existe)
  load_aprobacion_inst_corto_plazo(__opId);


  // Tabs inicial: mostrar instruir
  $(".tab-panel").addClass("hidden");
  $("#tab-instruir").removeClass("hidden");

  $("#btnAddFondeo").on("click", addFondeoTab);
});


// Eliminar transferencia (delegado)
$(document).on("click", ".btn-delete-transfer", function(e){
  e.preventDefault();

  const $panel   = $(this).closest(".tab-panel");
  const panelId  = $panel.attr("id"); // ej: "tab-fondeo-2"
  if (!panelId) return;

  // No permitir borrar el panel base
  if (panelId === "tab-instruir") return;

  Swal.fire({
    title: "¿Eliminar transferencia?",
    text: "Se quitará el tab y su contenido.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#dc2626",
    cancelButtonColor: "#6b7280"
  }).then(res => {
    if (!res.isConfirmed) return;

    // 1) Quitar el panel
    $panel.remove();

    // 2) Quitar el tab de la cabecera
    const $tabA = $(`#tabs a[href="#${panelId}"]`);
    $tabA.closest("li").remove();

    // 3) Reetiquetar tabs restantes ("Transferencia Bancaria 1..N")
    $('#tabs a[href^="#tab-fondeo-"]').each(function(i){
      $(this).text(`Transferencia Bancaria ${i+1}`);
    });

    // 4) Activar algún tab visible
    const $alguno = $("#panels .tab-panel").not(".hidden").first();
    if (!$alguno.length) {
      // si ninguno está visible, mostrar base por defecto
      $(".tab-panel").addClass("hidden");
      $("#tab-instruir").removeClass("hidden");
      // marcar activo en pestañas
      $(".tab-link").removeClass("active");
      $(`#tabs a[href="#tab-instruir"]`).addClass("active");
    } else {
      // asegurar que haya un tab activo coherente
      const visId = $alguno.attr("id");
      $(".tab-link").removeClass("active");
      $(`#tabs a[href="#${visId}"]`).addClass("active");
    }

    // 5) Actualizar snapshot completo en localStorage
    //    (usa tu función upsert ya agregada)
    if (typeof aprobacion_inst_corto_plazo_upsert === "function") {
      aprobacion_inst_corto_plazo_upsert();
    }

    toastr.success("Transferencia eliminada.");
  });
});


// ------ Helpers para setear selects (soporta select2) ------
function __ensureOption($sel, value, text) {
  if (value == null || value === "") return;
  // Si el option no existe, lo agregamos
  if ($sel.find(`option[value="${value}"]`).length === 0) {
    const $opt = $('<option/>', { value, text: text || value });
    $sel.append($opt);
  }
}
function __setSelect2Value($sel, value, text) {
  if (value == null || value === "") { $sel.val(null).trigger("change"); return; }
  __ensureOption($sel, value, text);
  $sel.val(String(value)).trigger("change");
}

// ------ Helper para mostrar el nombre del archivo en el "drop" principal ------
function __setDropFileName($scope, fileName) {
  if (!fileName) return;
  const $fileName = $scope.find(".fileName").first();
  if ($fileName.length) {
    $fileName.removeClass("hidden").text(fileName);
    $scope.find(".drop .font-semibold").text("📎 Archivo cargado");
    $scope.find(".drop .text-gray-500").text(fileName);
  }
}

// ------ Helper: crea campos dinámicos por cada documento adicional (solo muestra nombre) ------
function __renderDynamicDocsByNames(panelId, names) {
  if (!Array.isArray(names) || !names.length) return;
  names.forEach((name) => {
    // Creamos un campo dinámico con el nombre como etiqueta
    createDocumentField(panelId, name, true);
    // Visualmente “marcamos” que ya hay archivo (no podemos cargar el File real por seguridad del navegador)
    const $group = $(`#field_${panelId}_doc_${docCounterByPanel[panelId]}`);
    $group.find(".file-upload-area")
      .html(`<div class="file-name">📎 ${name}</div><div class="upload-text text-green-600 text-sm">Archivo previamente adjuntado</div>`);
  });
}

// ---- Tab principal: leer el archivo del drop (#file_base / #fileName_base)
function __collectBaseDropDoc() {
  const inp = document.getElementById("file_base");
  if (inp && inp.files && inp.files[0]) return inp.files[0].name;
  const txt = $("#fileName_base").text().trim();
  return txt || null;
}

// ---- Tab principal: mostrar nombre del archivo en el drop base
function __setBaseDropFileName(fileName) {
  if (!fileName) return;
  $("#fileName_base").removeClass("hidden").text(fileName);
  $("#drop_base .font-semibold").text("📎 Archivo cargado");
  $("#drop_base .text-gray-500").text(fileName);
}



/**
 * Carga inicial desde localStorage y pinta en la UI.
 * @param {string} opId - ID/código de la inversión (ej. INV-7000 / INV-6120)
 */
function load_aprobacion_inst_corto_plazo(opId) {
  try {
    const KEY = "aprobacion_inst_corto_plazo";
    const lista = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(lista) || !lista.length) return;

    const snap = lista.find(x => x && x.opId === opId);
    if (!snap) return;

    // -------- Operación principal (tab-instruir) --------
    const base = snap.base || {};
    // Combos base (Select2): banco/cuenta destino
    __setSelect2Value($("#banco_destino_base"), base.bancoDestinoId, base.bancoDestinoTxt);
    __setSelect2Value($("#cuenta_destino_base"), base.cuentaDestinoId, base.cuentaDestinoTxt);

    // Documento principal (drop)
    __setBaseDropFileName(base.documentoPrincipal);

    // Documentos dinámicos
    __renderDynamicDocsByNames("tab-instruir", base.documentosAdicionales);

    // -------- Transferencias (crear tantas como existan y setear campos) --------
    const arr = Array.isArray(snap.transferencias) ? snap.transferencias : [];
    if (arr.length) {
      // Limpieza opcional: si ya hay tabs de fondeo por defecto, puedes dejarlos o removerlos antes
      // (Por defecto partimos de cero y vamos agregando)
    }

    arr.forEach((t, i) => {
      // Crea un panel nuevo con tu factory (inicializa select2, validadores, etc.)
      addFondeoTab(); // genera #tab-fondeo-N y su tab correspondiente. :contentReference[oaicite:2]{index=2}

      // Ese último panel creado:
      const panelId = `tab-fondeo-${fondeoCount}`;
      const $p = $(`#${panelId}`);

      // Moneda / Monto
      if (t.moneda) $p.find(".moneda").val(t.moneda).trigger("change");
      if (t.montoRaw) {
        $p.find(".monto").val(t.montoRaw);
      } else if (typeof t.monto === "number") {
        // fallback simple si no hay raw (sin formateo miles)
        $p.find(".monto").val(t.monto.toString());
      }

      // Banco/cuenta de cargo
      __setSelect2Value($p.find(".banco"), t.bancoCargoId, t.bancoCargoTxt);
      __setSelect2Value($p.find(".cuenta"), t.cuentaCargoId, t.cuentaCargoTxt);

      // Banco/cuenta destino
      __setSelect2Value($p.find(".banco_destino"), t.bancoDestinoId, t.bancoDestinoTxt);
      __setSelect2Value($p.find(".cuenta_destino"), t.cuentaDestinoId, t.cuentaDestinoTxt);

      // Documento principal del panel de fondeo
      __setDropFileName($p, t.documentoPrincipal);

      // Documentos dinámicos del panel
      __renderDynamicDocsByNames(panelId, t.documentosAdicionales);
    });

    // Deja activo el tab base o el último que prefieras
    $(".tab-link").removeClass("active");
    $(`#tabs a[href="#tab-instruir"]`).addClass("active");
    $(".tab-panel").addClass("hidden");
    $("#tab-instruir").removeClass("hidden");

    console.log(`[aprobación][load] snapshot cargado para ${opId}.`);
  } catch (err) {
    console.error("Error al cargar desde localStorage:", err);
  }
}


