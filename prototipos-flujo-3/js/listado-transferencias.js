// =============== TOASTR CONFIG ===============
toastr.options = {
  closeButton:true,newestOnTop:true,progressBar:true,
  positionClass:"toast-top-right",timeOut:2600,extendedTimeOut:1200,
  showDuration:160,hideDuration:160,showMethod:"fadeIn",hideMethod:"fadeOut"
};

// =============== DATA MOCK ===============
let transferencias = [
  {
    entidad: "fdo-consolidado",
    unidad: "fcr-macrofondo",
    cuenta: "001-1234567-0-12",
    bancoOrigen: "BCP",
    bancoDestino: "SCOTIABANK",
    moneda: "PEN",
    estado: "REGISTRADA",
    transferenciaNum: "TRF-2025-0001",
    fechaSolicitud: "29/09/2025",
    fechaEjecucion: "-",
    fechaRecepcion: "-",
    monto: "1,250,000.00",
    comprobante: "",
    hijos: [
      { id: "M-101", concepto: "Abono",   fecha: "29/09/2025", monto: "1,250,000.00", documento: "—", estado: "DESAGREGADO REGISTRADO" }
    ]
  },
  {
    entidad: "fdo-consolidado",
    unidad: "tesoreria",
    cuenta: "019-1200345-0-22",
    bancoOrigen: "SCOTIABANK",
    bancoDestino: "BCP",
    moneda: "USD",
    estado: "EN PROCESO",
    transferenciaNum: "TRF-2025-0002",
    fechaSolicitud: "29/09/2025",
    fechaEjecucion: "30/09/2025",
    fechaRecepcion: "-",
    monto: "850,000.00",
    comprobante: "C-984532.pdf",
    hijos: [
      { id: "M-102", concepto: "Cargo", fecha: "30/09/2025", monto: "850,000.00", documento: "OP-321.pdf", estado: "INSTRUIDO" }
    ]
  },
  {
    entidad: "fcr-macrofondo",
    unidad: "fcr-macrofondo",
    cuenta: "019-5554321-0-01",
    bancoOrigen: "BBVA",
    bancoDestino: "INTERBANK",
    moneda: "USD",
    estado: "CONFIRMADA",
    transferenciaNum: "TRF-2025-0003",
    fechaSolicitud: "27/09/2025",
    fechaEjecucion: "28/09/2025",
    fechaRecepcion: "28/09/2025",
    monto: "2,400,000.00",
    comprobante: "C-884211.pdf",
    hijos: [
      { id: "M-103", concepto: "Abono", fecha: "28/09/2025", monto: "2,400,000.00", documento: "C-884211.pdf", estado: "APROBADO" }
    ]
  },
  {
    entidad: "fdo-consolidado",
    unidad: "tesoreria",
    cuenta: "001-9876543-0-77",
    bancoOrigen: "INTERBANK",
    bancoDestino: "BBVA",
    moneda: "PEN",
    estado: "CANCELADA",
    transferenciaNum: "TRF-2025-0004",
    fechaSolicitud: "29/09/2025",
    fechaEjecucion: "-",
    fechaRecepcion: "-",
    monto: "600,000.00",
    comprobante: "",
    hijos: []
  }
];

// =============== HELPERS ===============
function getAreaParam(){
  const p = new URLSearchParams(window.location.search);
  return p.get("area");
}
const area = getAreaParam();
if (area) {
  document.getElementById("area-badge").textContent = "Perfil: " + area;
}

function estadoBadge(st){
  if(st==="CONFIRMADA") return 'status-confirmada';
  if(st==="CANCELADA")  return 'status-cancelada';
  if(st==="EN PROCESO") return 'status-proceso';
  return 'status-registrada'; // REGISTRADA
}
function badgeHijo(st){
  if(st==="APROBADO")                 return '<span class="status-badge" style="background:#a8cee5;color:#334c7a">APROBADO</span>';
  if(st==="INSTRUIDO")                return '<span class="status-badge" style="background:#d1fae5;color:#065f46">INSTRUIDO</span>';
  if(st==="DESAGREGADO REGISTRADO")   return '<span class="status-badge" style="background:#dee5a8;color:#62611b">DESAGREGADO REG.</span>';
  return '<span class="status-badge" style="background:#fee2e2;color:#991b1b">CANCELADO</span>';
}

function parseAnyDate(s){
  if(!s || s==="-" ) return null;
  if(s.includes("/")){ // dd/mm/yyyy
    const [d,m,y] = s.split("/").map(x=>parseInt(x,10));
    if(!isNaN(d)&&!isNaN(m)&&!isNaN(y)) return new Date(y, m-1, d);
  }
  if(/\d{4}-\d{2}-\d{2}/.test(s)){ // yyyy-mm-dd
    const [y,m,d] = s.split("-").map(x=>parseInt(x,10));
    if(!isNaN(d)&&!isNaN(m)&&!isNaN(y)) return new Date(y, m-1, d);
  }
  return null;
}

// =============== RENDER PRINCIPAL ===============
function renderTabla(list){
  const $tb = $("#transferenciasBody").empty();

  list.forEach((t, idx)=>{
    const key = `r${idx}`;

    // Fila padre
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <span class="status-badge ${estadoBadge(t.estado)}">${t.estado}</span>
        <span class="toggle" data-target="${key}" style="margin-left:8px;">
        </span>
      </td>
      <td>${t.transferenciaNum}</td>
      <td class="text-left">${t.bancoOrigen}</td>
      <td class="text-left">${t.bancoDestino}</td>
      <td>${t.fechaSolicitud}</td>
      <td>${t.fechaEjecucion}</td>
      <td>${t.fechaRecepcion}</td>
      <td>${t.moneda}</td>
      <td class="text-right">${t.monto}</td>
      <td class="text-left">${t.comprobante || "—"}</td>
      <td>
        ${t.estado === "REGISTRADA" && area === "Tesoreria" ? `
          <div class="actions-cell" style="display:flex;gap:8px;justify-content:center;align-items:center">
            <button class="btn btn-action btn-registrar" onclick="irAAprobacion('${t.transferenciaNum}')">Aprobar</button>
          </div>` : ``}
        ${t.estado === "EN PROCESO" && area === "Tesoreria" ? `
          <div class="actions-cell" style="display:flex;gap:8px;justify-content:center;align-items:center">
            <button class="btn btn-action btn-confirmar" onclick="abrirModalConfirmacion('${t.transferenciaNum}')">Confirmar</button>
          </div>` : ``}
        ${t.estado === "CONFIRMADA" ? `
          <div class="actions-cell" style="display:flex;gap:8px;justify-content:center;align-items:center">
            <button class="btn btn-action" onclick="descargarComprobante('${t.comprobante}')">Comprobante</button>
          </div>` : ``}
      </td>
    `;
    $tb.append(tr);

    // Fila hijo (tabla interior)
    const trChild = document.createElement("tr");
    trChild.className = "child-row";
    trChild.innerHTML = `
      <td colspan="11" style="padding:0;border-bottom:none">
        <div class="child-wrap" id="wrap-${key}">
          <div style="padding:12px 16px 16px">
            <table style="width:100%;min-width:1100px;border-collapse:collapse">
              <thead>
                <tr>
                  <th style="background:#eef2f7;color:#334155;padding:8px;border-radius:6px 0 0 6px"># Mov.</th>
                  <th style="background:#eef2f7;color:#334155;padding:8px">Concepto</th>
                  <th style="background:#eef2f7;color:#334155;padding:8px">Fecha</th>
                  <th style="background:#eef2f7;color:#334155;padding:8px">Monto</th>
                  <th style="background:#eef2f7;color:#334155;padding:8px">Documento</th>
                  <th style="background:#eef2f7;color:#334155;padding:8px;border-radius:0 6px 6px 0">Estado</th>
                </tr>
              </thead>
              <tbody id="child-body-${key}">
                ${(t.hijos||[]).map(h=>`
                  <tr style="border-bottom:1px dashed #e8eef5">
                    <td style="padding:8px"><b>${h.id}</b></td>
                    <td style="padding:8px">${h.concepto}</td>
                    <td style="padding:8px">${h.fecha}</td>
                    <td style="padding:8px" class="text-right">${h.monto}</td>
                    <td style="padding:8px" class="text-left">${h.documento}</td>
                    <td style="padding:8px">${badgeHijo(h.estado)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </td>
    `;
    $tb.append(trChild);
  });

  // toggles
  $(".toggle").off("click").on("click", function(e){
    e.stopPropagation();
    const key = $(this).data("target");
    const $wrap = $(`#wrap-${key}`);
    const $sign = $(`#sign-${key}`);
    const isHidden = $wrap.is(":hidden");
    $wrap.stop(true,true).slideToggle(160);
    $sign.text(isHidden ? "−" : "+");
  });

  // destacar fila padre
  $("#transferenciasBody > tr").off("click").on("click", function(){
    $("#transferenciasBody > tr").removeClass("selected");
    $(this).addClass("selected");
  });
}

// =============== FILTROS ===============
function filtrar(base){
  const fEntidad = ($("#entidad").val() || "").toLowerCase();
  const fUnidad  = ($("#unidadNegocio").val() || "").toLowerCase();
  const fCta     = ($("#cuenta").val() || "").trim().toLowerCase();
  const fNum     = ($("#nroTransaccion").val() || "").trim().toLowerCase();
  const fDesde   = parseAnyDate($("#fechaDesde").val());
  const fHasta   = parseAnyDate($("#fechaHasta").val());

  return base.filter(r=>{
    if(fEntidad && (r.entidad||"").toLowerCase()!==fEntidad) return false;
    if(fUnidad  && (r.unidad ||"").toLowerCase()!==fUnidad ) return false;
    if(fCta     && !((r.cuenta||"").toLowerCase().includes(fCta))) return false;
    if(fNum     && !((r.transferenciaNum||"").toLowerCase().includes(fNum))) return false;

    // Rango por Fecha Solicitud (criterio principal)
    if(fDesde || fHasta){
      const fechaSol = parseAnyDate(r.fechaSolicitud);
      if(!fechaSol) return false;
      if(fDesde && fechaSol < fDesde) return false;
      if(fHasta && fechaSol > fHasta) return false;
    }
    return true;
  });
}

function applyFilters(){
  renderTabla(filtrar(transferencias));
}

// =============== MODAL ===============
let transferenciaActual = null;

function irAAprobacion(num){
  transferenciaActual = transferencias.find(t=>t.transferenciaNum===num) || null;
  const url = `aprobacion-cuenta-remunerada.html?num=${encodeURIComponent(transferenciaActual.transferenciaNum)}`;
  window.location.href = url;
}

function abrirModalConfirmacion(num){
  transferenciaActual = transferencias.find(t=>t.transferenciaNum===num) || null;
  if(!transferenciaActual){ toastr.error("No se encontró la transferencia."); return; }

  // Info general
  const t = transferenciaActual;
  const campos = [
    { label: 'N° Transferencia', value: t.transferenciaNum },
    { label: 'Banco Origen',     value: t.bancoOrigen },
    { label: 'Banco Destino',    value: t.bancoDestino },
    { label: 'Moneda',           value: t.moneda },
    { label: 'Monto',            value: t.monto },
    { label: 'Fecha Solicitud',  value: t.fechaSolicitud },
    { label: 'Fecha Ejecución',  value: t.fechaEjecucion },
    { label: 'Fecha Recepción',  value: t.fechaRecepcion }
  ];
  document.getElementById("infoGeneral").innerHTML = campos.map(c=>`
    <div class="info-field">
      <div class="info-label">${c.label}</div>
      <div class="info-value">${c.value}</div>
    </div>`).join("");

  // Tab General (documentos de referencia)
  document.getElementById("tab-general").innerHTML = `
    <div style="margin-bottom: 20px;">
      <h4 style="color: #005C97; margin-bottom: 15px;">Documentos disponibles:</h4>
      <div class="document-item"><span>📄</span><span style="flex:1;">Orden de Transferencia</span><button class="btn btn-action" onclick="descargarDocumento('Orden de Transferencia')">Descargar</button></div>
      <div class="document-item"><span>📄</span><span style="flex:1;">Autorización</span><button class="btn btn-action" onclick="descargarDocumento('Autorización')">Descargar</button></div>
    </div>
  `;

  // Tab Tesorería (subidas obligatorias)
  document.getElementById("tab-tesoreria").innerHTML = `
    <div>
      <h4 style="color:#005C97;margin-bottom:15px;">Documentos requeridos:</h4>

      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:8px;font-weight:600;">Comprobante de la Transferencia</label>
        <div style="border:2px dashed #ccc;padding:20px;text-align:center;border-radius:8px;cursor:pointer" onclick="triggerFileUpload('comp-transfer')">
          <input type="file" id="comp-transfer" style="display:none" accept=".pdf" onchange="handleFileUpload(this,'Comprobante de la Transferencia')">
          <span id="status-comp-transfer" style="color:#666;">📄 Seleccionar archivo PDF</span>
        </div>
      </div>

      <div style="margin-bottom:20px;">
        <label style="display:block;margin-bottom:8px;font-weight:600;">Constancia de Recepción</label>
        <div style="border:2px dashed #ccc;padding:20px;text-align:center;border-radius:8px;cursor:pointer" onclick="triggerFileUpload('const-recep')">
          <input type="file" id="const-recep" style="display:none" accept=".pdf" onchange="handleFileUpload(this,'Constancia de Recepción')">
          <span id="status-const-recep" style="color:#666;">📄 Seleccionar archivo PDF</span>
        </div>
      </div>
    </div>
  `;

  // Justificación
  document.getElementById("seccionJustificacion").innerHTML = `
    <div style="margin-bottom: 20px;">
      <label style="display:block;margin-bottom:8px;font-weight:600;">Justificación</label>
      <textarea id="justificacion" rows="4" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:8px;resize:vertical"
        placeholder="Ingrese la justificación de confirmación..."></textarea>
    </div>
  `;

  document.getElementById("modalConfirmacion").style.display = "flex";
  toastr.info("Modal de confirmación abierto");
}
function cerrarModal(){
  document.getElementById("modalConfirmacion").style.display = "none";
  transferenciaActual = null;
}

function cambiarTab(name, ev){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('active'));
  ev.target.classList.add('active');
  document.getElementById('tab-'+name).classList.add('active');
}

// Upload handlers
function triggerFileUpload(id){ document.getElementById(id).click(); }
function handleFileUpload(input, label){
  const statusId = input.id === 'comp-transfer' ? 'status-comp-transfer' : 'status-const-recep';
  const el = document.getElementById(statusId);
  if(input.files.length>0){
    const name = input.files[0].name.toLowerCase();
    if(name.endsWith('.pdf')){
      el.innerHTML = `<span style="color:#28a745;">✅ ${input.files[0].name}</span>`;
      el.parentElement.style.borderColor = '#28a745';
      el.parentElement.style.backgroundColor = '#f8fff8';
    }else{
      el.innerHTML = `<span style="color:#dc3545;">❌ Solo archivos PDF</span>`;
      input.value = '';
    }
  }
}

function descargarDocumento(nombre){ toastr.success(`Descargando: ${nombre}`); }
function descargarComprobante(nombre){
  if(!nombre || nombre==="—"){ toastr.info("No hay comprobante disponible."); return; }
  toastr.success(`Descargando: ${nombre}`);
}

// Confirmar
async function confirmarTransferencia(){
  if(!transferenciaActual) return;

  const ok = await Swal.fire({
    title: "Confirmar transferencia",
    text: "¿Deseas confirmar esta transferencia? Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, confirmar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a"
  });
  if(!ok.isConfirmed){ toastr.info("Operación cancelada."); return; }

  const compOK  = document.getElementById('comp-transfer').files.length > 0;
  const recOK   = document.getElementById('const-recep').files.length > 0;
  const justif  = (document.getElementById('justificacion').value||"").trim();

  if(!compOK || !recOK || !justif){
    toastr.error("Debes cargar los PDFs obligatorios y completar la justificación.");
    return;
  }

  const idx = transferencias.findIndex(t=>t.transferenciaNum===transferenciaActual.transferenciaNum);
  if(idx !== -1){
    transferencias[idx].estado = "CONFIRMADA";
    transferencias[idx].fechaRecepcion = new Date().toLocaleDateString('es-PE');
    transferencias[idx].comprobante = document.getElementById('comp-transfer').files[0]?.name || "comprobante.pdf";
  }

  renderTabla(filtrar(transferencias));
  toastr.success(`Transferencia ${transferenciaActual.transferenciaNum} confirmada exitosamente`);
  setTimeout(cerrarModal, 1200);
}

// =============== INIT ===============
$(function(){
  $("#nroTransaccion").on("input", applyFilters);
  $("#entidad, #unidadNegocio, #cuenta, #nroTransaccion, #fechaDesde, #fechaHasta").on("change", applyFilters);

  $("#btnBuscar").on("click", applyFilters);
  $("#btnLimpiar").on("click", function(){
    $("#entidad").val(""); $("#unidadNegocio").val("");
    $("#cuenta").val(""); $("#nroTransaccion").val("");
    $("#fechaDesde").val(""); $("#fechaHasta").val("");
    applyFilters();
  });

  applyFilters();
});
