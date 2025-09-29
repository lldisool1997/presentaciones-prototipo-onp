// =============== TOASTR CONFIG ===============
  toastr.options = {
    closeButton:true,newestOnTop:true,progressBar:true,
    positionClass:"toast-top-right",timeOut:2600,extendedTimeOut:1200,
    showDuration:160,hideDuration:160,showMethod:"fadeIn",hideMethod:"fadeOut"
  };
  // =============== DATA MOCK ===============
  // Hijos usan estados: REGISTRADO, INSTRUIDO, CANCELADO
  let inversiones = [
      {
      entidad:"fdo-consolidado",
      accion: "aprobar",
      unidad:"fcr-macrofondo",
      tipo:"Instrumento de corto plazo",
      estado:"REGISTRADO",
      inversionNum:"6053",
      invPrincipal:"6053",
      codFCR:"INV-6053",
      producto:"Instrumento de corto plazo",
      numeroDeposito:"ALPINV-SEC-22",
      fechaCompra:"19/09/2025",
      fechaEmision:"19/09/2025",
      fechaVencimiento:"19/09/2030",
      cataApertura:"19/09/2025",
      cataCancelacion:"Local",
      moneda:"PEN",
      valorNominal:"10,000,000.00",
      compraSpotCupon:"",
      pCompraCupon:"-",
      ecoInstrument:"Instrumento de corto plazo",
    },
    {
      entidad:"fdo-consolidado",
      accion: "cancelar",
      unidad:"fcr-macrofondo",
      tipo:"Instrumento de corto plazo",
      estado:"APROBADO",
      inversionNum:"6053",
      invPrincipal:"6053",
      codFCR:"INV-6053",
      producto:"Instrumento de corto plazo",
      numeroDeposito:"ALPINV-SEC-22",
      fechaCompra:"19/09/2025",
      fechaEmision:"19/09/2025",
      fechaVencimiento:"19/09/2030",
      cataApertura:"19/09/2025",
      cataCancelacion:"Local",
      moneda:"PEN",
      valorNominal:"10,000,000.00",
      compraSpotCupon:"",
      pCompraCupon:"-",
      ecoInstrument:"Instrumento de corto plazo",
    },
    {
      entidad:"fdo-consolidado",
      accion: "X",
      unidad:"fcr-macrofondo",
      tipo:"Instrumento de corto plazo",
      estado:"CANCELADO",
      inversionNum:"6053",
      invPrincipal:"6053",
      codFCR:"INV-6053",
      producto:"Fondos Alternativos – Secondaries",
      numeroDeposito:"ALPINV-SEC-22",
      fechaCompra:"19/09/2025",
      fechaEmision:"19/09/2025",
      fechaVencimiento:"19/09/2030",
      cataApertura:"19/09/2025",
      cataCancelacion:"Local",
      moneda:"PEN",
      valorNominal:"10,000,000.00",
      compraSpotCupon:"",
      pCompraCupon:"-",
      ecoInstrument:"ALTERNATIVOS",
    },
  ];

  // =============== RENDER ===============
  function estadoBadge(st){
    if(st==="APROBADO") return 'status-aprobado';
    if(st==="CANCELADA") return 'status-cancelada';
    if(st==="REGISTRADO") return 'status-registrado';
    return '';
  }
  function badgeHijo(st){
    if(st==="REGISTRADO") return '<span class="status-badge" style="background:#e0e7ff;color:#3730a3">REGISTRADO</span>';
    if(st==="INSTRUIDO")  return '<span class="status-badge" style="background:#d1fae5;color:#065f46">INSTRUIDO</span>';
    if(st==="DESAGREGADO REGISTRADO")  return '<span class="status-badge" style="background:#dee5a8;color:#62611b">DESAGREGADO REGISTRADO</span>';
    if(st==="APROBADO")  return '<span class="status-badge" style="background:#a8cee5;color:#334c7a">APROBADO</span>';
    if(st==="OPERACIÓN REGISTRADA")  return '<span class="status-badge" style="background:#8b89df;color:#471970">OPERACIÓN REGISTRADA</span>';
    
    return '<span class="status-badge" style="background:#fee2e2;color:#991b1b">CANCELADO</span>';
  }

  function renderTabla(list){
    const $tb = $("#inversionesBody").empty();
    list.forEach((inv, idx)=>{
      const rowKey = `r${idx}`;

      // fila padre
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><span class="status-badge ${estadoBadge(inv.estado)}">${inv.estado}</span></td>
        <td>${inv.codFCR}</td>
        <td>${inv.invPrincipal}</td>
        <td class="text-left">${inv.producto}</td>
        <td class="text-left">${inv.numeroDeposito}</td>
        <td>${inv.fechaCompra}</td>
        <td>${inv.fechaEmision}</td>
        <td>${inv.fechaVencimiento}</td>
        <td>${inv.cataApertura}</td>
        <td>${inv.cataCancelacion}</td>
        <td class="text-right">${inv.moneda}</td>
        <td class="text-left">${inv.valorNominal}</td>
        <td>${inv.ecoInstrument}</td>
        <td>
          ${
                                inv.estado === "APROBADO" && getAreaParam() === "Tesoreria"
                                ? 
                                `  <div class="actions-cell" style="display:flex;gap:8px;justify-content:center;align-items:center">
            <button class="btn btn-action btn-llamado-registro" onclick="irARegistroDeCartaRecepcion('${inv.invPrincipal}')">
              Generar carta de Recepción
            </button>
            <button class="btn btn-action btn-llamado-registro" onclick="irARegistroDistribucion('${inv.invPrincipal}')">
              Cancelación
            </button>
          </div>`
                                :
                                
                                 ` `
                            }
            ${
                                inv.estado === "REGISTRADO" && getAreaParam() === "Tesoreria"
                                ? 
                                `  <div class="actions-cell" style="display:flex;gap:8px;justify-content:center;align-items:center">
                         <button class="btn btn-action btn-llamado-registro" onclick="irARegistrodeFondeo('${inv.invPrincipal}')">
              Transferir Fondos
            </button>
              <button class="btn btn-action btn-llamado-registro" onclick="irARegistroDeCartaAprobacion('${inv.invPrincipal}')">
              Generar Carta
            </button>
              <button class="btn btn-action btn-llamado-registro" onclick="irARegistroAprobacion('${inv.invPrincipal}')">
              Aprobar
            </button>
          </div>`
                                :
                                
                                 ` `
                            }
           ${
                                inv.estado !== "APROBADO" && getAreaParam() === "Tesoreria"
                                ? 
                                `  <div class="actions-cell" style="display:flex;gap:8px;justify-content:center;align-items:center">

          </div>`
                                :
                                
                                 `  `
                            }
        </td>
      `;
      $tb.append(tr);

      // fila hijo (colspan con tabla interior) animada
      const trChild = document.createElement("tr");
      trChild.className = "child-row";
      trChild.innerHTML = `
        <td colspan="17" style="padding:0;border-bottom:none">
          <div class="child-wrap" id="wrap-${rowKey}">
            <div style="padding:12px 16px 16px">
              <table style="width:100%;min-width:1100px;border-collapse:collapse">
                <thead>
                  <tr>
                    <th style="background:#eef2f7;color:#334155;padding:8px;border-radius:6px 0 0 6px">Cod. FCR</th>
                    <th style="background:#eef2f7;color:#334155;padding:8px">Tipo</th>
                    <th style="background:#eef2f7;color:#334155;padding:8px">Fecha</th>
                    <th style="background:#eef2f7;color:#334155;padding:8px">Monto</th>
                    <th style="background:#eef2f7;color:#334155;padding:8px">Documento</th>
                    <th style="background:#eef2f7;color:#334155;padding:8px">Estado</th>
                    <th style="background:#eef2f7;color:#334155;padding:8px;border-radius:0 6px 6px 0">Acciones</th>
                  </tr>
                </thead>
                <tbody id="child-body-${rowKey}">
                  ${(inv.hijos||[]).map((h,j)=>`
                    <tr style="border-bottom:1px dashed #e8eef5">
                      <td style="padding:8px"><b>${h.codFCR}</b></td>
                      <td style="padding:8px">${h.tipo}</td>
                      <td style="padding:8px">${h.fecha}</td>
                      <td style="padding:8px" class="text-right">${h.monto}</td>
                      <td style="padding:8px" class="text-left">${h.documento}</td>
                      <td style="padding:8px">${badgeHijo(h.estado)}</td>
                      <td style="padding:8px">
                            ${
                                h.estado === "DESAGREGADO REGISTRADO" && getAreaParam() === "DIN"
                                ? `<button class="btn btn-action btn-instruir"
                                    onclick="instruirMovimiento(${idx},${j})">
                                    Instruir a Back Office
                                    </button>`
                                : ""
                            }
                              ${
                                h.estado === "APROBADO" && getAreaParam() === "OGR"
                                ? `<button class="btn btn-action btn-instruir"
                                    onclick="registrarDesagregado(${idx},${j}, '${h.tipo}')">
                                    Registrar Desagregado
                                    </button>`
                                : ""
                            }
                            ${
                                h.estado === "INSTRUIDO" && getAreaParam() === "Tesoreria"
                                ? `<button class="btn btn-action btn-cancelar"
                                    onclick="irABackOffice(${idx},${j}, '${h.tipo}')">
                                    Registra Operación
                                    </button>`
                                : ""
                            }
                            ${
                                h.estado === "CANCELADO"
                                ? `<span style="color:#888;font-size:.8em;">Ya registrado en Back Office</span>`
                                : ""
                            }

                      </td>
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

    // toggles con animación
    $(".toggle").off("click").on("click", function(e){
      e.stopPropagation();
      const key = $(this).data("target");
      const $wrap = $(`#wrap-${key}`);
      const $sign = $(`#sign-${key}`);
      const isHidden = $wrap.is(":hidden");
      $wrap.stop(true,true).slideToggle(160);
      $sign.text(isHidden ? "−" : "+");
    });

    // seleccionar fila padre (solo highlight)
    $("#inversionesBody > tr").off("click").on("click", function(){
      $("#inversionesBody > tr").removeClass("selected");
      $(this).addClass("selected");
    });
  }

  // =============== ACCIONES HIJO ===============

  function cancelarMovimiento(i,j){
    const h = inversiones[i].hijos[j];
    if(h.estado==="CANCELADO"){ toastr.info("El movimiento ya estaba cancelado."); return; }
    h.estado = "CANCELADO";
    toastr.warning(`Movimiento ${h.id} cancelado.`);
    applyFilters();
  }

  // Redirige a Back Office (cambia el archivo si usarás otro)
const DESAGREGADO_URL_LLAMADO = "registro-desagregado-llamado.html";
const DESAGREGADO_URL_DISTRIBUCION = "registro-desagregado-distribucion.html";
const OPERACION_URL_LLAMADO = "backoffice-confirmar-operacion-llamado.html";
const OPERACION_URL_DISTRIBUCION = "backoffice-confirmar-operacion-dist.html";

async function instruirMovimiento(i, j){
  const h = inversiones[i].hijos[j];
  if(h.estado !== "DESAGREGADO REGISTRADO"){
    toastr.error("Solo puedes notificar un movimiento en estado DESAGREGADO REGISTRADO.");
    return;
  }

  // Primera confirmación
  const step1 = await Swal.fire({
    title: `¿Instruir a Back Office?`,
    text: `Movimiento ${h.id} (${h.tipo}) por ${h.monto}`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, instruir",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#2563eb"
  });

  if(!step1.isConfirmed){
    toastr.info("Notificación cancelada.");
    return;
  }



  // Cambiar estado
  h.estado = "INSTRUIDO";
  Swal.fire({
    icon: "success",
    title: "Instruido",
    text: `Movimiento ${h.id} fue INSTRUIDO.`,
    timer: 2000,
    showConfirmButton: false
  });
  applyFilters();
}

async function registrarDesagregado(i, j, tipo){
    const inv = inversiones[i];
  const h = inv.hijos[j];
  if(h.estado !== "APROBADO"){
    toastr.error("Solo puedes registrar un desagregado de un movimiento en estado APROBADO.");
    return;
  }

  const qs = new URLSearchParams({
      inv: inv.invPrincipal,
      codFCR: inv.codFCR,
      mov: h.id,
      tipo: h.tipo,
      fecha: h.fecha,
      monto: h.monto,
      doc: h.documento,
      area: "OGR",
    }).toString();

    if(tipo === "Llamado"){
        window.location.href = `${DESAGREGADO_URL_LLAMADO}?${qs}`;
    } else if (tipo === "Distribucion"){
        window.location.href = `${DESAGREGADO_URL_DISTRIBUCION}?${qs}`;
    } else {
        toastr.error("Tipo de movimiento desconocido.");
        return;
    }
}


async function cancelarMovimiento(i, j){
  const inv = inversiones[i];
  const h = inv.hijos[j];

  if(h.estado !== "INSTRUIDO"){
    toastr.error("Para continuar, el movimiento debe estar INSTRUIDO (notificado).");
    return;
  }

  const go = await Swal.fire({
    title: "Registrar en Back Office",
    text: `¿Deseas ir a la vista de Back Office para registrar el movimiento ${h.id}?`,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a"
  });

  if(go.isConfirmed){
    const qs = new URLSearchParams({
      inv: inv.invPrincipal,
      codFCR: inv.codFCR,
      mov: h.id,
      tipo: h.tipo,
      fecha: h.fecha,
      monto: h.monto,
      doc: h.documento,
    }).toString();

    if(tipo === "Llamado"){
        window.location.href = `${OPERACION_URL_LLAMADO}?${qs}`;
    } else if (tipo === "Distribucion"){
        window.location.href = `${OPERACION_URL_DISTRIBUCION}?${qs}`;
    } else {
        toastr.error("Tipo de movimiento desconocido.");
        return;
    }
  }
}

async function cancelarMovimiento(i, j){
  const inv = inversiones[i];
  const h = inv.hijos[j];

  if(h.estado !== "INSTRUIDO"){
    toastr.error("Para continuar, el movimiento debe estar INSTRUIDO (notificado).");
    return;
  }

  const go = await Swal.fire({
    title: "Registrar en Back Office",
    text: `¿Deseas ir a la vista de Back Office para registrar el movimiento ${h.id}?`,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a"
  });

  if(go.isConfirmed){
    const qs = new URLSearchParams({
      inv: inv.invPrincipal,
      codFCR: inv.codFCR,
      mov: h.id,
      tipo: h.tipo,
      fecha: h.fecha,
      monto: h.monto,
      doc: h.documento,
    }).toString();

    window.location.href = `${BACKOFFICE_URL}?${qs}`;
  }
}


  // =============== NAVEGACIÓN ===============


function irARegistrodeFondeo(inversionId){
    if(inversionId){
      window.location.href = `fondeo-banco.html?area=Tesoreria&inv_id=${encodeURIComponent(inversionId)}`;
    }else{
      window.location.href = "fondeo-banco.html";
    }
  }


  function irARegistroAprobacion(inversionId){
    if(inversionId){
      window.location.href = `aprobar-instrumento.html?area=DIN&inv_id=${encodeURIComponent(inversionId)}`;
    }else{
      window.location.href = "aprobar-instrumento.html";
    }
  }

    function irARegistroDeCartaAprobacion(inversionId){
    if(inversionId){
      window.location.href = `generar-carta-aprobacion.html?area=Tesoreria&inv_id=${encodeURIComponent(inversionId)}`;
    }else{
      window.location.href = "generar-carta-aprobacion.html";
    }
  }

  
 function irARegistroDeCartaRecepcion(inversionId){
    if(inversionId){
      window.location.href = `generar-carta-recepcion.html?area=Tesoreria&inv_id=${encodeURIComponent(inversionId)}`;
    }else{
      window.location.href = "generar-carta-recepcion.html";
    }
  }

    function irARegistroDistribucion(inversionId){
    if(inversionId){
      window.location.href = `registro-distribucion-capital.html?area=DIN&inv_id=${encodeURIComponent(inversionId)}`;
    }else{
      window.location.href = "registro-distribucion-capital.html";
    }
  }


  function irAAprobacion(inversionId) {
  const claseActivo     = "Inversiones Alternativas";
  const mercado         = "Local";
  const subcategoria    = "Fondos de inversión";
  const tipoInstrumento = "Fondo privado";

  // Construir query params
  const params = new URLSearchParams({
    claseActivo,
    mercado,
    subcategoria,
    tipoInstrumento
  });

  // Si además hay inversionId, se agrega
  if (inversionId) {
    params.set("inv_id", inversionId);
  }

  // Redirección con todos los parámetros
  window.location.href = `aprobacion-instrumento.html?${params.toString()}`;
}


  window.irAAprobacion = irAAprobacion;

   function irABackOffice(i, j, tipo) {
  const inv = inversiones[i];
  const h   = inv.hijos[j];

  // Armar URL con todos los datos necesarios
  let url;
  if(tipo === "Llamado"){
     url = new URL(OPERACION_URL_LLAMADO, window.location.href);
    } else if (tipo === "Distribucion"){
       url = new URL(OPERACION_URL_DISTRIBUCION, window.location.href);
    } else {
        toastr.error("Tipo de movimiento desconocido.");
        return;
    }
  url.searchParams.set("inv", inv.inversionNum);
  url.searchParams.set("codFCR", inv.codFCR);
  url.searchParams.set("mov", h.id);
  url.searchParams.set("tipo", h.tipo);
  url.searchParams.set("fecha", h.fecha);
  url.searchParams.set("monto", h.monto);
  url.searchParams.set("doc", h.documento);
  url.searchParams.set("ctas", inv.flagCtas);
  url.searchParams.set("area", "Tesoreria");
  url.searchParams.set("bank", inv.banco || "Banco de Crédito del Perú (BCP)"); // si no lo tienes aún, agrega en mock

  window.location.href = url.toString();
}
window.irABackOffice = irABackOffice;
  window.irARegistroAprobacion = irARegistroAprobacion;
  window.irARegistrodeFondeo = irARegistrodeFondeo;
  window.irARegistroDeCartaAprobacion = irARegistroDeCartaAprobacion;
  window.irARegistroDeCartaRecepcion = irARegistroDeCartaRecepcion;

  // =============== FILTROS (manteniendo los tuyos) ===============
  function filtrar(base){
    const fEntidad = $("#entidad").val() || "";
    const fUnidad  = $("#unidadNegocio").val() || "";
    const fTipo    = $("#tipoInstrumento").val() || "";
    const fInvNum  = ($("#inversionNum").val()||"").trim().toLowerCase();
    const fDep     = ($("#numeroDeposito").val()||"").trim().toLowerCase();
    const fEstadoH = $("#estadoFiltro").val() || "";

    return base.filter(r=>{
      if(fEntidad && r.entidad!==fEntidad) return false;
      if(fUnidad  && r.unidad !==fUnidad ) return false;
      if(fTipo    && r.tipo   !==fTipo   ) return false;
      if(fInvNum  && !(`${r.inversionNum}`.toLowerCase().includes(fInvNum))) return false;
      if(fDep     && !(`${r.numeroDeposito}`.toLowerCase().includes(fDep))) return false;
      if(fEstadoH){
        if(!(r.hijos||[]).some(h=>h.estado===fEstadoH)) return false;
      }
      return true;
    });
  }

  function applyFilters(){
    let accion = getAccion();
    let subaccion = getSubAccion();
    inversiones = inversiones.filter(inv => {
        if (accion && inv.accion !== accion) return false;
        return true;
    });
    
    inversiones[0].hijos = inversiones[0].hijos ? inversiones[0].hijos.filter(hijo => {
        if(!hijo.accion) return true;
        if (subaccion && (hijo.accion !== subaccion)) return false;
        return true;
    }) : [];

    console.log(inversiones[0].hijos)

    renderTabla(filtrar(inversiones));
  }

  // =============== INIT ===============
  $(function(){
    // Inputs de texto -> al escribir
    $("#inversionNum, #numeroDeposito").on("input", applyFilters);

    // Selects y checkboxes -> al cambiar
    $("#entidad, #unidadNegocio, #tipoInstrumento, #estadoFiltro, #checkFechaCompra, #checkFechaEmision, #checkFechaVencim")
    .on("change", applyFilters);


    $("#btnBuscar").on("click", applyFilters);
    $("#btnLimpiar").on("click", function(){
      $("#entidad").val(""); $("#unidadNegocio").val("");
      $("#tipoInstrumento").val(""); $("#inversionNum").val("");
      $("#numeroDeposito").val(""); $("#estadoFiltro").val("");
      $("#checkFechaCompra").prop("checked", false);
      $("#checkFechaEmision").prop("checked", false);
      $("#checkFechaVencim").prop("checked", false);
      applyFilters();
    });

    applyFilters();


  });

      async function aprobarInversion() {
            if (!inversionActual) return;

              // Segunda confirmación
        const step2 = await Swal.fire({
          title: "Confirmación",
          text: "¿Estás completamente seguro de aprobar el instrumento?. Esta acción no se puede deshacer.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Sí, aprobar",
          cancelButtonText: "No",
          confirmButtonColor: "#dc2626"
        });

        if(!step2.isConfirmed){
          toastr.info("Notificación cancelada.");
          return;
        }

            const confirmacion = document.getElementById('confirmacion-compra').files.length > 0;
            const constancia = document.getElementById('constancia-venta').files.length > 0;
            const justificacion = document.getElementById('justificacion').value.trim();

            if (!confirmacion || !constancia || !justificacion) {
                toastr.error('Debe cargar todos los documentos básicos y completar la justificación');
                return;
            }

            for (let doc of documentosAdicionales) {
                if (!doc.archivo) {
                    toastr.error(`Debe cargar el documento: ${doc.etiqueta}`);
                    return;
                }
            }

            const index = inversiones.findIndex(inv => inv.inversionNum === inversionActual.inversionNum);
            if (index !== -1) {
                inversiones[index].estado = 'APROBADO';
            }

            renderTabla(filtrar(inversiones));

            toastr.success(`Inversión ${inversionActual.inversionNum} ha sido APROBADA exitosamente`);

            setTimeout(() => {
                cerrarModal();
            }, 1500);

            
        }

  let inversionActual = null;

        function abrirModalAprobacion(inversion) {
          console.log(inversion)
            inversionActual = inversion;
            documentosAdicionales = [];
            llenarInformacionGeneral(inversion);
            llenarDocumentosGeneral();
            configurarDocumentosTesoreria();
            configurarSeccionJustificacion();

            document.getElementById('modalAprobacion').style.display = 'flex';
            toastr.info('Modal de aprobación abierto');
        }

        function cerrarModal() {
            document.getElementById('modalAprobacion').style.display = 'none';
            inversionActual = null;
        }

        function cambiarTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

            event.target.classList.add('active');
            document.getElementById('tab-' + tabName).classList.add('active');
        }


        function llenarInformacionGeneral(inversion) {
            const container = document.getElementById('infoGeneral');

            const campos = [
                { label: 'Código del instrumento', value: 'INV-6123' },
                { label: 'Unidad de negocio', value: 'FCR-LEY N° 28046' },
                { label: 'Plazo de vencimiento', value: 'Se calculará automáticamente' },
                { label: 'Emisor', value: 'REPUBLICA DEL PERU' },
                { label: 'Clasificación de riesgos', value: 'BBB+' },
                { label: 'Grupo económico', value: 'Grupo Romero' },
                { label: 'ISIN', value: inversion.producto || 'PE0324005A57' },
                { label: 'Nemónico', value: 'SBPER' },
                { label: 'Moneda', value: 'PEN' },
                { label: 'Cantidad', value: '1,000.00' },
                { label: 'Valor unitario', value: '1,000.00' },
                { label: 'Valor nominal adquirido', value: inversion.valorNominal || '1,000,000.00' },
                //{ label: 'Periodicidad del cupón', value: 'Semestral' },
                //{ label: 'Cupón (%)', value: '6.5000' },
                //{ label: 'Tipo de amortización', value: 'Amortizable' },
                { label: 'Fecha de emisión', value: inversion.fechaEmision || '20/09/2025' },
                { label: 'Fecha Liquidación', value: '19/09/2030' },
                { label: 'Fecha de vencimiento', value: inversion.fechaVencimiento || '20/09/2029' },
                { label: 'Plazo en años', value: '5' },
                { label: 'Banco cuenta de cargo', value: 'BANCO DE CRÉDITO' },
                { label: 'N° de Cuenta Bancaria', value: 'N° 193-13814691-0-31' },
                { label: 'Tipo de custodia', value: 'Local' },
                { label: 'Nombre de custodia', value: 'Banco Scotiabank' },
                { label: 'Tipo de Mercado', value: 'Primario' }
            ];

            container.innerHTML = campos.map(campo => `
        <div class="info-field">
            <div class="info-label">${campo.label}</div>
            <div class="info-value">${campo.value}</div>
        </div>
    `).join('');
        }
        function llenarDocumentosGeneral() {
            const container = document.getElementById('tab-general');

            const documentosGenerales = [
                'Informe de Riesgos',
                'Informe Legal',
                'Acta de Comité de Inversiones'
            ];

            container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #005C97; margin-bottom: 15px;">Documentos ya cargados:</h4>
            ${documentosGenerales.map(doc => `
                <div class="document-item">
                    <span style="color: #28a745;">📄</span>
                    <span style="flex: 1;">${doc}</span>
                    <button class="btn btn-action" style="background: #17a2b8; color: white;" 
                            onclick="descargarDocumento('${doc}')">Descargar</button>
                </div>
            `).join('')}
        </div>
    `;
        }

        let documentosAdicionales = [];

        function configurarDocumentosTesoreria() {
            const container = document.getElementById('tab-tesoreria');

            container.innerHTML = `
        <div>
            <h4 style="color: #005C97; margin-bottom: 15px;">Documentos requeridos para aprobación:</h4>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                    Confirmación de compra
                </label>
                <div style="border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px; cursor: pointer;"
                     onclick="triggerFileUpload('confirmacion-compra')">
                    <input type="file" id="confirmacion-compra" style="display: none;" 
                           accept=".pdf" onchange="handleFileUpload(this, 'Confirmación de compra')">
                    <span id="status-confirmacion" style="color: #666;">📄 Seleccionar archivo PDF</span>
                </div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                    Constancia de Confirmación de Venta de Entidad Financiera
                </label>
                <div style="border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px; cursor: pointer;"
                     onclick="triggerFileUpload('constancia-venta')">
                    <input type="file" id="constancia-venta" style="display: none;" 
                           accept=".pdf" onchange="handleFileUpload(this, 'Constancia de venta')">
                    <span id="status-constancia" style="color: #666;">📄 Seleccionar archivo PDF</span>
                </div>
            </div>

            <!-- Contenedor para documentos adicionales -->
            <div id="documentos-adicionales-container">
                <!-- Los documentos adicionales se agregarán aquí dinámicamente -->
            </div>
            
            <!-- Configuración Avanzada -->
            <div style="margin-top: 30px; border-top: 2px solid #e9ecef; padding-top: 20px;">
                <h4 style="color: #005C97; margin-bottom: 15px;">⚙️ Configuración Avanzada</h4>
                <div style="display: flex; gap: 10px; align-items: end; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">
                            Etiqueta del documento:
                        </label>
                        <input type="text" id="nueva-etiqueta" placeholder="Ej: Autorización especial" 
                               style="width: 100%; padding: 8px; border: 2px solid #e0e0e0; border-radius: 5px;">
                    </div>
                    <button type="button" onclick="agregarDocumentoAdicional()" 
                            style="background: #17a2b8; color: white; border: none; padding: 10px 20px; border-radius: 5px; font-weight: 600; cursor: pointer;">
                        + Agregar Documento
                    </button>
                </div>
                <small style="color: #6c757d; font-style: italic;">
                    Los documentos agregados serán requeridos para completar la aprobación.
                </small>
            </div>
        </div>
    `;
        }
        function triggerFileUpload(inputId) {
            document.getElementById(inputId).click();
        }

        function handleFileUpload(input, docName) {
            const statusId = input.id === 'confirmacion-compra' ? 'status-confirmacion' : 'status-constancia';
            const statusElement = document.getElementById(statusId);

            if (input.files.length > 0) {
                const fileName = input.files[0].name;
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    statusElement.innerHTML = `<span style="color: #28a745;">✅ ${fileName}</span>`;
                    statusElement.parentElement.style.borderColor = '#28a745';
                    statusElement.parentElement.style.backgroundColor = '#f8fff8';
                } else {
                    statusElement.innerHTML = `<span style="color: #dc3545;">❌ Solo archivos PDF</span>`;
                    input.value = '';
                }
            }
        }

        function descargarDocumento(nombreDoc) {
            toastr.success(`Descargando: ${nombreDoc}`);
        }

        
        function configurarSeccionJustificacion() {
            const container = document.getElementById('seccionJustificacion');

            container.innerHTML = `
        <div style="margin-bottom: 20px;">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                Justificación de la operación
            </label>
            <textarea id="justificacion" rows="4" style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; resize: vertical;"
                      placeholder="Ingrese la justificación para esta operación..."></textarea>
        </div>
    `;
        }

                function agregarDocumentoAdicional() {
            const etiquetaInput = document.getElementById('nueva-etiqueta');
            const etiqueta = etiquetaInput.value.trim();

            if (!etiqueta) {
                toastr.error('Debe ingresar una etiqueta para el documento');
                return;
            }

            if (documentosAdicionales.some(doc => doc.etiqueta === etiqueta)) {
                toastr.error('Ya existe un documento con esa etiqueta');
                return;
            }

            const docId = 'doc-adicional-' + Date.now();
            const nuevoDoc = {
                id: docId,
                etiqueta: etiqueta,
                archivo: null
            };

            documentosAdicionales.push(nuevoDoc);

            renderizarDocumentosAdicionales();

            etiquetaInput.value = '';

            toastr.success(`Documento "${etiqueta}" agregado`);
        }

         function renderizarDocumentosAdicionales() {
            const container = document.getElementById('documentos-adicionales-container');

            container.innerHTML = documentosAdicionales.map(doc => `
        <div style="margin-bottom: 20px; position: relative;" id="container-${doc.id}">
            <label style="display: block; margin-bottom: 8px; font-weight: 600;">
                ${doc.etiqueta}
                <button type="button" onclick="eliminarDocumentoAdicional('${doc.id}')" 
                        style="background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 3px; font-size: 12px; margin-left: 10px; cursor: pointer;">
                    ✕
                </button>
            </label>
            <div style="border: 2px dashed #ccc; padding: 20px; text-align: center; border-radius: 8px; cursor: pointer;"
                 onclick="triggerFileUpload('${doc.id}')">
                <input type="file" id="${doc.id}" style="display: none;" 
                       accept=".pdf" onchange="handleFileUploadAdicional(this, '${doc.etiqueta}')">
                <span id="status-${doc.id}" style="color: #666;">📄 Seleccionar archivo PDF</span>
            </div>
        </div>
    `).join('');
        }

                function handleFileUploadAdicional(input, etiqueta) {
            const statusElement = document.getElementById(`status-${input.id}`);
            const doc = documentosAdicionales.find(d => d.id === input.id);

            if (input.files.length > 0) {
                const fileName = input.files[0].name;
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    statusElement.innerHTML = `<span style="color: #28a745;">✅ ${fileName}</span>`;
                    statusElement.parentElement.style.borderColor = '#28a745';
                    statusElement.parentElement.style.backgroundColor = '#f8fff8';
                    if (doc) doc.archivo = input.files[0];
                } else {
                    statusElement.innerHTML = `<span style="color: #dc3545;">❌ Solo archivos PDF</span>`;
                    input.value = '';
                    if (doc) doc.archivo = null;
                }
            }
        }

          function eliminarDocumentoAdicional(docId) {
            documentosAdicionales = documentosAdicionales.filter(doc => doc.id !== docId);
            renderizarDocumentosAdicionales();
            toastr.info('Documento eliminado');
        }

             function getAreaParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get("area");
  }

      function getAccion() {
    const params = new URLSearchParams(window.location.search);
    return params.get("accion");
  }

      function getSubAccion() {
    const params = new URLSearchParams(window.location.search);
    return params.get("subaccion");
  }

  const area = getAreaParam();
  if (area) {
    document.getElementById("area-badge").textContent = "Perfil: " + area;
  }