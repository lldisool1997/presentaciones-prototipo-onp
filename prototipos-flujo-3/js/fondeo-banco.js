// -------- Mock de inversión seleccionada --------
const selectedInvestment = {
  id: "INV-6120",
  entidad: "Fondo Consolidado de Reservas Previsionales – FCR",
  descripcion: "Inversión de Prueba"
};

// -------- Mock cuentas bancarias (reemplaza por las reales) --------
const BANCOS = [
  { id: "BCP", text: "Banco de Crédito del Perú (BCP)" },
  { id: "Scotiabank", text: "Scotiabank Perú" },
  { id: "BBVA", text: "BBVA Perú" },
  { id: "Interbank", text: "Interbank" }
];

const CUENTAS_BANCARIAS = [
  // BCP
  { id: "BCP-PEN-001", banco: "BCP", text: "193-1990153-0-54" },

  // Scotiabank
  { id: "SCOTIA-PEN-002", banco: "Scotiabank", text: "970-0700108" },

  // BBVA
  { id: "BBVA-PEN-003", banco: "BBVA", text: "0011-0661-02-00040907" },

  // Interbank
  { id: "INTERBANK-PEN-004", banco: "Interbank", text: "200-3067561380" }
];

// -------- Helpers visuales / validación --------
function markInvalid($el){ $el.addClass("ring-2 ring-red-400 border-red-400"); }
function clearInvalid($el){ $el.removeClass("ring-2 ring-red-400 border-red-400"); }

function validateFile(f){
  if(!f) return { ok:false, msg:"Adjunta el documento de tranferencia (PDF/JPG/PNG)." };
  const okExt = /(\.pdf|\.png|\.jpg|\.jpeg)$/i.test(f.name);
  if(!okExt) return { ok:false, msg:"Formato no permitido. Solo PDF, JPG o PNG." };
  if(f.size > 10*1024*1024) return { ok:false, msg:"Archivo supera 10MB. Adjunta uno más liviano." };
  return { ok:true };
}

// ======= Globals para documentos dinámicos =======
let filesUploaded = {};
let documentCounter = 1;
let documentRequirements = {};
let currentArea = 'general'; // si luego tienes áreas, cámbialo dinámicamente

// Crea el contenedor si no existe para evitar errores
function ensureDocumentFieldsContainer(){
  let cont = document.getElementById('documentFields');
  if (!cont) {
    const host = document.querySelector('.config-section') || document.getElementById('formLlamado') || document.body;
    cont = document.createElement('div');
    cont.id = 'documentFields';
    cont.className = 'mt-4 grid gap-3';
    host.appendChild(cont);
  }
  return cont;
}

// ======= Crear un campo de subida PDF (sin inline onclick) =======
function createDocumentField(docName, fieldId, isCustom = false) {
  const container = ensureDocumentFieldsContainer();

  const fieldGroup = document.createElement('div');
  fieldGroup.className = 'file-upload-group p-3 rounded-xl w-1/3';
  fieldGroup.id = `field_${fieldId}`;

  const labelWrap = document.createElement('div');
  labelWrap.className = 'flex items-center mb-2 text-left gap-3';

  const label = document.createElement('label');
  label.className = 'font-semibold';
  label.textContent = docName;

  if (isCustom) {
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button'; // evita submit
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = '✕';
    removeBtn.onclick = () => removeCustomDocument(fieldId);
    labelWrap.appendChild(removeBtn);
  }
  labelWrap.appendChild(label);

  const uploadArea = document.createElement('div');
  uploadArea.className = 'file-upload-area text-center rounded-sm border-2 border-dashed border-gray-300 bg-muted p-4 cursor-pointer hover:border-blue-400 transition-colors';
  uploadArea.innerHTML = `
    <div class="upload-text font-medium">📄 Seleccionar archivo</div>
    <div class="upload-text text-gray-500 text-sm mt-1">PDF</div>
  `;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = fieldId;
  fileInput.style.display = 'none';
  fileInput.accept = '.pdf';
  fileInput.addEventListener('change', (e) => handleFileUpload(e.target, docName));

  fieldGroup.appendChild(labelWrap);
  fieldGroup.appendChild(uploadArea);
  fieldGroup.appendChild(fileInput);
  container.appendChild(fieldGroup);

    filesUploaded[fieldId] = false;

}

// ======= Abrir el input file oculto de cada uploader dinámico (delegado) =======
function bindDynamicUploadClickOnce(){
  if (window.__bindDynamicUploadClickOnce) return;
  window.__bindDynamicUploadClickOnce = true;
  $(document)
    .off('click.openInput', '.file-upload-area')
    .on('click.openInput', '.file-upload-area', function(e){
      // evita que un botón dentro de la card robe el click
      if (e.target.closest('.remove-btn')) return;
      const input = this.parentElement.querySelector('input[type="file"]');
      if (input) input.click();
    });
}
bindDynamicUploadClickOnce();

// ======= Validar y pintar estado de la subida =======
function handleFileUpload(input, documentType) {
  const fileArea = input.previousElementSibling;

  if (input.files.length > 0) {
    const file = input.files[0];
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.pdf')) {
      fileArea.innerHTML = `
        <div class="upload-text text-red-600">⌫ Solo se permiten archivos PDF</div>
        <div class="upload-text text-gray-500 text-sm mt-1">PDF</div>
      `;
      input.value = '';
      filesUploaded[input.id] = false;
      $(fileArea).addClass('ring-2 ring-red-400 border-red-400');
    } else if (file.size > 10 * 1024 * 1024) {
      fileArea.innerHTML = `
        <div class="upload-text text-red-600">⌫ Archivo supera 10MB</div>
        <div class="upload-text text-gray-500 text-sm mt-1">PDF</div>
      `;
      input.value = '';
      filesUploaded[input.id] = false;
      $(fileArea).addClass('ring-2 ring-red-400 border-red-400');
    } else {
      // ok
      fileArea.innerHTML = `
        <div class="file-name">📎 ${file.name}</div>
        <div class="upload-text text-green-600 text-sm">Archivo cargado correctamente</div>
      `;
      filesUploaded[input.id] = true;
      $(fileArea).removeClass('ring-2 ring-red-400 border-red-400');
    }
  } else {
    fileArea.innerHTML = `
      <div class="upload-text font-medium">📄 Seleccionar archivo</div>
      <div class="upload-text text-gray-500 text-sm mt-1">PDF</div>
    `;
    filesUploaded[input.id] = false;
    $(fileArea).addClass('ring-2 ring-red-400 border-red-400');
  }

  checkFormCompletion();
}

// ======= Agregar nuevo documento (sin submit) =======
function addCustomDocument(e) {
  if (e && e.preventDefault) e.preventDefault();
  else if (window.event) window.event.preventDefault();

  const input = document.getElementById('newDocumentName');
  const docName = (input?.value || '').trim();

  if (!docName) {
    if (window.toastr) toastr.warning('Por favor ingresa un nombre para el documento.');
    else alert('Por favor ingresa un nombre para el documento.');
    return;
  }

  const fieldId = `custom_${currentArea}_${documentCounter++}`;
  createDocumentField(docName, fieldId, true);

  if (!documentRequirements[currentArea + '_custom']) {
    documentRequirements[currentArea + '_custom'] = [];
  }
  documentRequirements[currentArea + '_custom'].push(docName);

  input.value = '';
}

// ======= Remover documento dinámico =======
function removeCustomDocument(fieldId) {
  const fieldElement = document.getElementById(`field_${fieldId}`);
  if (fieldElement) {
    fieldElement.remove();
    delete filesUploaded[fieldId];
  }
  checkFormCompletion();
}

// ======= (Opcional) Habilitar/deshabilitar guardar según adjuntos =======
function checkFormCompletion() {
  const submitBtn = document.querySelector('#formLlamado button[type="submit"]');
  if (!submitBtn) return;

  const ids = Object.keys(filesUploaded);           // solo dinámicos creados
  if (ids.length === 0) {                           // si no hay dinámicos, no bloquees
    submitBtn.disabled = false;
    return;
  }

  const allOk = ids.every(id => filesUploaded[id]); // todos adjuntos y válidos
  submitBtn.disabled = !allOk;
}

// Exponer funciones
window.addCustomDocument = addCustomDocument;
window.removeCustomDocument = removeCustomDocument;

// ======= Ready =======
$(function(){
    // Filtrar cuentas
  const cuentasFiltradas = CUENTAS_BANCARIAS.filter(c => c.banco === "BCP");

  // Recargar cuentas en select2
  $("#cuenta").empty().select2({
    data: cuentasFiltradas,
    placeholder: "Selecciona una cuenta...",
    allowClear: true,
    width: "100%"
  });
    $("#cuenta_destino").empty().select2({
    data: cuentasFiltradas,
    placeholder: "Selecciona una cuenta...",
    allowClear: true,
    width: "100%"
  });
  // header (si existe el contenedor)
  if ($("#cardInversion").length){
    $("#cardInversion").html(`
      <div class="bg-muted border rounded-xl p-3">
        <div class="text-xs text-gray-500">Entidad</div>
        <div class="font-semibold">${selectedInvestment.entidad}</div>
      </div>
      <div class="bg-muted border rounded-xl p-3">
        <div class="text-xs text-gray-500">Descripción</div>
        <div class="font-semibold">${selectedInvestment.descripcion}</div>
      </div>
    `);
  }
  $("#inv_id").val(selectedInvestment.id);

  // toastr cfg
  if (window.toastr) {
    toastr.options = { positionClass:"toast-top-right", timeOut:3000, progressBar:true };
  }

  // Select2 cuentas
 // Inicializar bancos
$("#banco").select2({
  data: BANCOS,
  placeholder: "Selecciona un banco...",
  allowClear: true,
  width: "100%"
});

// Inicializar cuentas (vacías al inicio)
$("#cuenta").select2({
  placeholder: "Selecciona una cuenta...",
  allowClear: true,
  width: "100%"
});


$("#banco_destino").select2({
  data: BANCOS,
  placeholder: "Selecciona un banco...",
  allowClear: true,
  width: "100%"
});

// Inicializar cuentas (vacías al inicio)
$("#cuenta_destino").select2({
  placeholder: "Selecciona una cuenta...",
  allowClear: true,
  width: "100%"
});

  new Cleave('#monto', {
    numeral: true,
    numeralThousandsGroupStyle: 'thousand',
    numeralDecimalMark: '.',
    delimiter: ','
  });

// Filtrar cuentas según banco elegido
$("#banco").on("change", function () {
  const bancoSeleccionado = $(this).val();

  // Filtrar cuentas
  const cuentasFiltradas = CUENTAS_BANCARIAS.filter(c => c.banco === bancoSeleccionado);

  // Recargar cuentas en select2
  $("#cuenta").empty().select2({
    data: cuentasFiltradas,
    placeholder: "Selecciona una cuenta...",
    allowClear: true,
    width: "100%"
  });
  
});

$("#banco_destino").on("change", function () {
  const bancoSeleccionado = $(this).val();

  // Filtrar cuentas
  const cuentasFiltradas = CUENTAS_BANCARIAS.filter(c => c.banco === bancoSeleccionado);

  // Recargar cuentas en select2
  $("#cuenta_destino").empty().select2({
    data: cuentasFiltradas,
    placeholder: "Selecciona una cuenta...",
    allowClear: true,
    width: "100%"
  });
  
});


  // refs
  const $fecha = $("#fecha_llamado");
  const $monto = $("#monto");
  const $banco   = $("#banco");
  const $cta   = $("#cuenta");
  const $drop  = $("#drop");
  const $file  = $("#file");
  const $fileName = $("#fileName");

  // Hacer el drop principal clicleable y con textos requeridos
  $drop
    .off('click.dropOpen')                       // evita duplicados
    .on('click.dropOpen', function(e){
      if (e.target.id === 'file') return;        // si clic directamente en el input
      $file.trigger('click');                    // abrir file picker
    });
  // Prompt deseado
  $drop.find(".font-semibold").text("📄 Seleccionar archivo");
  $drop.find(".text-gray-500").text("PDF");

  // Botón manual (si lo agregas)
  $("#btnFile").off('click.pick').on("click.pick", ()=> $file.click());

  // change del file principal
  $file.off('change.main').on("change.main", function(){
    const f = this.files[0];
    const v = validateFile(f);
    if(!v.ok){
      $(this).val("");
      $fileName.addClass("hidden").text("");
      markInvalid($drop);
      toastr.error(v.msg);
      // restaurar prompt
      $drop.find(".font-semibold").text("📄 Seleccionar archivo");
      $drop.find(".text-gray-500").text("PDF");
      return;
    }
    clearInvalid($drop);
    $fileName.removeClass("hidden").text(f.name);
    toastr.success("Documento adjuntado.");
  });

  // drag & drop principal
  $drop
    .off('dragover.dd dragleave.dd drop.dd')
    .on("dragover.dd", e=>{ e.preventDefault(); $drop.addClass("ring-2 ring-blue-300"); })
    .on("dragleave.dd", e=>{ e.preventDefault(); $drop.removeClass("ring-2 ring-blue-300"); })
    .on("drop.dd", function(e){
      e.preventDefault();
      $drop.removeClass("ring-2 ring-blue-300");
      const dt = e.originalEvent.dataTransfer;
      if(!(dt && dt.files && dt.files[0])) return;
      const f = dt.files[0];
      const v = validateFile(f);
      if(!v.ok){
        $file.val("");
        $fileName.addClass("hidden").text("");
        markInvalid($drop);
        toastr.error(v.msg);
        // restaurar prompt
        $drop.find(".font-semibold").text("📄 Seleccionar archivo");
        $drop.find(".text-gray-500").text("PDF");
        return;
      }
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(f);
      $file[0].files = dataTransfer.files;

      clearInvalid($drop);
      $fileName.removeClass("hidden").text(f.name);
      toastr.success("Documento adjuntado.");
    });

  // submit -> validar + modal
  $("#formLlamado").off('submit.main').on("submit.main", function(e){
    e.preventDefault();

    // limpiar marcas
    clearInvalid($fecha); clearInvalid($monto); clearInvalid($drop);
    $cta.next(".select2").removeClass("ring-2 ring-red-400");
    $cta.next(".select2").removeClass("ring-2 ring-red-400");

    // fecha
    if(!$fecha.val()){
      markInvalid($fecha); toastr.warning("Indica la fecha del llamado de capital."); $fecha.focus(); return;
    }
    // monto
    const montoStr = ($monto.val()||"").trim();
    const montoNum = parseFloat(montoStr.replace(/,/g,""));
    if(!montoStr || isNaN(montoNum)){
      markInvalid($monto); toastr.warning("Monto inválido. Usa formato 1,234.56"); $monto.focus(); return;
    }
    // cuenta bancaria
        // cuenta bancaria
    const bancoId = $banco.val();
    const bancoTxt = $banco.select2('data')[0]?.text || "";
    if(!bancoId){
      $banco.next(".select2").addClass("ring-2 ring-red-400");
      toastr.warning("Selecciona el banco."); 
      $banco.select2('open');
      return;
    }

    const ctaId = $cta.val();
    const ctaTxt = $cta.select2('data')[0]?.text || "";
    if(!ctaId){
      $cta.next(".select2").addClass("ring-2 ring-red-400");
      toastr.warning("Selecciona la cuenta bancaria."); 
      $cta.select2('open');
      return;
    }
    // archivo principal
    const fileObj = $file[0].files[0];
    const fv = validateFile(fileObj);
    if(!fv.ok){
      markInvalid($drop); toastr.warning(fv.msg); $("#btnFile").focus(); return;
    }

    // 🔒 validar TODOS los documentos dinámicos
const missing = [];
for (const [id, ok] of Object.entries(filesUploaded)) {
  if (!ok) {
    const group = document.getElementById(`field_${id}`);
    const area  = group?.querySelector('.file-upload-area');
    const label = group?.querySelector('label')?.textContent?.trim() || id;
    if (area) $(area).addClass('ring-2 ring-red-400 border-red-400');
    missing.push(label);
  }
}
if (missing.length) {
  toastr.warning(`Adjunta los siguientes documentos: ${missing.join(', ')}`);
  return; // ⛔ no pasa
}

    // ok -> doble check
$("#review").html(`
  <dl class="divide-y divide-gray-200 text-sm text-gray-700">
    <div class="py-2 flex justify-between">
      <dt class="font-medium text-gray-600">Código del instrumento:</dt>
      <dd class="text-gray-900">${selectedInvestment.descripcion}</dd>
    </div>
    <div class="py-2 flex justify-between">
      <dt class="font-medium text-gray-600">Fecha:</dt>
      <dd class="text-gray-900">${$fecha.val()}</dd>
    </div>
    <div class="py-2 flex justify-between">
      <dt class="font-medium text-gray-600">Monto:</dt>
      <dd class="text-gray-900">${montoStr}</dd>
    </div>
    <div class="py-2 flex justify-between">
      <dt class="font-medium text-gray-600">Cuenta bancaria:</dt>
      <dd class="text-gray-900">${ctaTxt}</dd>
    </div>
    <div class="py-2 flex justify-between">
      <dt class="font-medium text-gray-600">Documento:</dt>
      <dd class="text-gray-900">${fileObj.name}</dd>
    </div>
  </dl>
`);

    $("#chkConfirm").prop("checked", false);
    $("#btnConfirmSave").prop("disabled", false);
    $("#confirmModal").removeClass("hidden").addClass("flex");
  });

  // confirm modal
  $("#chkConfirm").off('change.main').on("change.main", function(){
    $("#btnConfirmSave").prop("disabled", !this.checked);
  });
  $("#btnCancelConfirm").off('click.main').on("click.main", ()=> $("#confirmModal").addClass("hidden").removeClass("flex"));
  $("#btnConfirmSave").off('click.main').on("click.main", function(){
    $("#confirmModal").addClass("hidden").removeClass("flex");
    toastr.success("✅ Llamado de capital registrado.");
    $("#formLlamado")[0].reset();
    $("#banco").val(null).trigger("change");
    $("#fileName").addClass("hidden").text("");
    // limpia estado de dinámicos
    filesUploaded = {};
    document.getElementById('documentFields')?.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
    document.getElementById('documentFields')?.querySelectorAll('.file-upload-area').forEach(a => a.innerHTML = `
      <div class="upload-text font-medium">📄 Seleccionar archivo</div>
      <div class="upload-text text-gray-500 text-sm mt-1">PDF</div>
    `);
    // reset del drop principal a prompt
    $drop.find(".font-semibold").text("📄 Seleccionar archivo");
    $drop.find(".text-gray-500").text("PDF");
  });

  // Botón "+ Agregar Documento" (una sola vez)
  if (!window.__bindAddDocOnce) {
    window.__bindAddDocOnce = true;
    $(document).on('click.addDoc', '.add-document-btn', function(e){
      e.preventDefault();
      addCustomDocument(e);
    });
  }
});
             function getAreaParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("area");
  }

  const area = getAreaParam();
  if (area) {
    document.getElementById("area-badge").textContent = "Perfil: " + area;
  }