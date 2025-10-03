
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

  // Recalcular total neto
function actualizarTotalNeto(){
  const monto = 150000000.00;
  const interes = 6885000.00;
  const comisionStr = ($("#comision").val() || "").replace(/,/g,"");
  const comision = parseFloat(comisionStr) || 0;
  const total = monto + interes + comision;
  $("#totalNeto").val(total.toLocaleString("es-PE", { minimumFractionDigits:2 }));
}

$("#comision").on("input", actualizarTotalNeto);

// Comisión independiente por panel
$(document).on("input", ".comision", function(){
  const $panel = $(this).closest(".tab-panel");
  const monto = 150000000;
  const comision = parseFloat($(this).val().replace(/,/g,"")) || 0;
  const total = monto + comision;
  $panel.find(".totalNeto").val(total.toLocaleString("es-PE",{minimumFractionDigits:2}));
});
// Generar Carta
$("#btnGenerarCarta").on("click", function(e){
  e.preventDefault();
  Swal.fire({
    title: "Generar carta",
    text: "Se generará la carta con los datos de la operación.",
    icon: "info",
    confirmButtonText: "Aceptar"
  });
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
  createDocumentField("tab-instruir", "Carta de instrucción (PDF)");
  createDocumentField("tab-instruir", "Constancia de custodia (PDF)");

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
  $tpl.find(".cabecera-transferencia").text(`2. Transferencia a banco #${fondeoCount}`);
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
  createDocumentField(panelId, "Voucher de transferencia (PDF)");

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
      Swal.fire({ icon:"success", title:"¡Fondeo registrado!", confirmButtonColor:"#16a34a" });
    });
  });

  // Activar el tab nuevo
  $(`#tabs a[href="#${panelId}"]`).trigger("click");
}

// Ready
$(function(){
  // Toastr cfg
  toastr.options = { positionClass:"toast-top-right", timeOut:2500, progressBar:true };

  bindDelegatesOnce();
  initBasePanel();

  // Tabs inicial: mostrar instruir
  $(".tab-panel").addClass("hidden");
  $("#tab-instruir").removeClass("hidden");

  addFondeoTab(); // carga inicial con data de ejemplo
});
