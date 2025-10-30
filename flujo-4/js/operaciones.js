const { createApp, computed } = Vue;

// UUID v4 con fallbacks (crypto.randomUUID -> crypto.getRandomValues -> Math.random)
function genId() {
  // 1) Soporte nativo
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 2) Web Crypto clásico
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    // Variante y versión seguras
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant RFC 4122
    const toHex = (n) => n.toString(16).padStart(2, '0');
    const b = Array.from(bytes, toHex).join('');
    return `${b.slice(0,8)}-${b.slice(8,12)}-${b.slice(12,16)}-${b.slice(16,20)}-${b.slice(20)}`;
  }
  // 3) Fallback simple
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}


// --- Directiva de formato monetario ---
const moneyBaseOptions = {
  digitGroupSeparator: ',',
  decimalCharacter: '.',
  decimalPlaces: 2,
  allowDecimalPadding: true,
  modifyValueOnWheel: false,
  emptyInputBehavior: 'null',
  watchExternalChanges: true,
  outputFormat: 'number'
};

const MoneyDirective = {
  mounted(el, binding) {
    const opts = { ...moneyBaseOptions, ...(binding.value || {}) };
    el.__an = new AutoNumeric(el, opts);

    const syncToModel = () => {
      if (!el.__an) return;
      const raw = el.__an.getNumericString();
      const e = new Event('input', { bubbles: true });
      el.value = raw ?? '';
      el.dispatchEvent(e);
    };

    el.__anSync = syncToModel;
    el.addEventListener('autoNumeric:rawValueModified', syncToModel);
    el.addEventListener('change', syncToModel);
  },
  updated(el, binding) {
    if (binding.value && el.__an) el.__an.update(binding.value);
  },
  unmounted(el) {
    if (el.__an) {
      el.removeEventListener('autoNumeric:rawValueModified', el.__anSync);
      el.removeEventListener('change', el.__anSync);
      el.__an.remove();
      delete el.__an;
      delete el.__anSync;
    }
  }
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  customClass: {
    popup: 'rounded-xl shadow-md',
    timerProgressBar: 'tw-toast-progress' // opcional (puedes estilizarlo)
  },
  timer: 1800,
  timerProgressBar: true
});

const app = createApp({
  data(){
    return {
      selected: null,   // { tipo, id }
      dataAll: null,    // contenido de localStorage instruccionesData
      curr: null,       // instrucción encontrada
      tiposTransferencia: null,
      master: {         // fallback si no existe en LS
        monedas: ['PEN','USD'],
        cuentas: [],
        personas: [],
        types: [],
      },
      ui: {
        activeRowIdx: 0,
        newDocOpName: ''   // ← nombre que escribe Operaciones antes de adjuntar
      }
      
    };
  },

  created(){
  // 1) lee selección
  try { this.selected = JSON.parse(localStorage.getItem('selectedInstruction') || 'null'); }
  catch(_) { this.selected = null; }

  // 2) carga dataset completo
  try { this.dataAll = JSON.parse(localStorage.getItem('instruccionesData') || '{}'); }
  catch(_) { this.dataAll = {}; }

  // 3) master y búsqueda
  if (this.dataAll?.master) this.master = { ...this.master, ...this.dataAll.master };

  if (this.selected?.tipo && this.selected?.id) {
    const list = this.dataAll?.state?.instructionsByType?.[this.selected.tipo] || [];
    this.curr = list.find(i => i.id === this.selected.id) || null;
  }

  // 👉 asegura el slot de operación al cargar
  this.ensureOperacionSlot();
  this.loadTiposTransaccion();

  // índice válido si no hay detalle
  if (!this.curr?.detalle?.length) this.ui.activeRowIdx = -1;
},

  computed: {
    totalFilas(){
      return this.curr?.detalle?.length || 0;
    },
    approvedRowsCount(){
      if (!this.curr?.detalle) return 0;
      return this.curr.detalle.filter(r => !!r.aprob).length;
    },
    totalMonto(){
      if (!this.curr?.detalle) return 0;
      return this.curr.detalle.reduce((acc, r) => {
        const n = parseFloat(String(r.monto ?? '0').replace(/[, ]/g,''));
        return acc + (isNaN(n) ? 0 : n);
      }, 0);
    },
 docsOfOperacion(){
  const ins = this.curr;
  if (!ins) return [];
  const norm = (d) => ({
    id: d.id ?? genId(),
    label: d.label ?? 'Sustento de operación',
    fileName: d.fileName ?? '',
    url: d.url ?? null,
    tipo: 'operacion'
  });
  return Array.isArray(ins.docsOperacion) ? ins.docsOperacion.map(norm) : [];
},
    // En operaciones.js -> computed.docsOfInstruction (reemplaza la función)
docsOfInstruction(){
  const ins = this.curr;
  if (!ins) return [];

  const norm = (d, tipo) => ({
    id: d.id ?? d.key ?? crypto.randomUUID(),
    label: d.label ?? 'Documento',
    fileName: d.fileName ?? '',
    url: d.url ?? null,
    tipo
  });

  //const base    = Array.isArray(ins.docsIniciales)            ? ins.docsIniciales.map(d => norm(d,'inicial')) : [];
  //const extra   = Array.isArray(ins.docsExtras)               ? ins.docsExtras.map(d => norm(d,'extra'))      : [];
  const global  = Array.isArray(ins.docsGlobalSeleccionados)  ? ins.docsGlobalSeleccionados.map(d => norm(d,'global')) : [];
  /*const sueltos = Array.isArray(ins.docs)
    ? ins.docs.map(d => norm({ id:d.id, label:'Sustento documentario', fileName: d.nombre }, 'adj'))
    : [];*/

  // iniciales → extras → globales → sueltos
  return [...global];
},
    activeRow(){
      const list = this.curr?.detalle || [];
      const i = this.ui.activeRowIdx;
      if (i == null || i < 0 || i >= list.length) return null;
      return list[i];
    },
      // Lista de docsOperacion de la FILA ACTIVA (solo lectura para el v-for)
  activeRowDocsOperacion() {
    const i = this.getActiveRowIdx();
    const row = (i >= 0) ? this.curr?.detalle?.[i] : null;
    return Array.isArray(row?.docsOperacion) ? row.docsOperacion : [];
  },
  totalMonto() {
  const rows = this.curr?.detalle || [];
  return rows.reduce((acc, r) => acc + this._parseMoney(r?.monto), 0);
},
totalMontoFormateado() {
  return this.totalMonto.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
},
 activeMonto() {
    const v = this.activeRow?.monto;
    if (v == null || v === '') return 0;
    const n = Number(String(v).replace(/\s/g,'').replace(/,/g,''));
    return Number.isFinite(n) ? n : 0;
  },
  activeMontoFormateado() {
    return this.activeMonto.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
  },

  methods: {
    
  getCategoriaTipoTrx(trx) {
      const list = Array.isArray(this.tiposTransferencia) ? this.tiposTransferencia : [];
      if (trx == null) return null;

      const key = String(trx).trim().toLowerCase();
      const item = list.find(e =>
        String(e?.descripcion ?? '').trim().toLowerCase() === key
      );

      return item?.categoria ?? null;
    },
      getCodigoTipoTrx(trx) {
      const list = Array.isArray(this.tiposTransferencia) ? this.tiposTransferencia : [];
      if (trx == null) return null;

      const key = String(trx).trim().toLowerCase();
      const item = list.find(e =>
        String(e?.descripcion ?? '').trim().toLowerCase() === key
      );

      return item?.codigo ?? null;
    },
     ensureOperacionSlot(){
    if (!this.curr) return;
    if (!Array.isArray(this.curr.docsOperacion)) {
      this.curr.docsOperacion = [];
      // persistir en localStorage dentro del blob existente
      try{
        const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
        const tipo = this.selected?.tipo;
        const id   = this.selected?.id;
        if (data?.state?.instructionsByType?.[tipo]) {
          const list = data.state.instructionsByType[tipo];
          const i = list.findIndex(x => x.id === id);
          if (i !== -1) {
            list[i].docsOperacion = [];
            localStorage.setItem('instruccionesData', JSON.stringify(data));
          }
        }
      }catch(e){ console.error(e); }
    }
  },
    money(v){
      if (v == null || v === '') return '—';
      const num = Number(String(v).replace(/[, ]/g,''));
      if (isNaN(num)) return '—';
      return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    accountAlias(id){
      if (!id) return '—';
      const c = (this.master?.cuentas || []).find(x => x.id === id);
      if (!c) return id;
      const alias = c.alias || 'Cuenta';
      const num = c.numero || '';
      return `${alias} — ${num}`;
    },
    personaNombre(id){
      if (!id) return '';
      const p = (this.master?.personas || []).find(x => x.id === id);
      return p?.nombre || id;
    },

    // Asegura uid en todas las filas (llámalo en created/mounted una vez)
ensureRowUids() {
  const det = this.curr?.detalle || [];
  det.forEach(r => { if (!r.uid) r.uid = (r.id || genId()); });
},

// Abre la carta con 'tipo', 'instId' y 'rowUid'
generarCarta(row){
  if (!row) return;
  if (!row.uid) row.uid = (row.id || genId());

  const params = new URLSearchParams({
    tipo: this.selected?.tipo || '',
    instId: String(this.selected?.id || ''),
    rowUid: String(row.uid || ''),
  });

  // en nueva pestaña/ventana para mantener el estado acá
  window.open(`generar-carta.html?${params.toString()}`, '_blank', 'noopener');
},
  generarComision(row){
    // la comisión se guarda dentro del row, puedes usarla luego si la persistes
    if (!row.comision) {
      alert('No se ingresó comisión (campo opcional).');
      return;
    }
    alert('Comisión ingresada: ' + this.money(row.comision));
  },
  // Validador simple (PDF/XLS/XLSX)
isFileAllowed(file){
  if (!file) return false;
  const m = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return m.includes(file.type) || ['pdf','xls','xlsx'].includes(ext);
},

addOperacionDoc(){
  if (!this.curr) return;
  if (!Array.isArray(this.curr.docsOperacion)) this.curr.docsOperacion = [];
  this.curr.docsOperacion.push({
    id: genId(),
    label: 'Sustento de operación',
    fileName: '',
    file: null,
    url: null
  });
  this.persistOperacionDocs();
},

onFileOperacion(ev, d){
  const f = ev.target.files?.[0];
  if (!f) return;
  if (!this.isFileAllowed(f)) { alert('Solo PDF o Excel'); ev.target.value = ''; return; }
  d.file = f;
  d.fileName = f.name;
  // si usas objeto URL local (solo para vista rápida)
  d.url = URL.createObjectURL(f);
  this.persistOperacionDocs();
},

clearOperacionFile(d){
  d.file = null;
  d.fileName = '';
  d.url = null;
  this.persistOperacionDocs();
},

removeOperacionDoc(idx){
  if (!this.curr?.docsOperacion) return;
  this.curr.docsOperacion.splice(idx, 1);
  this.persistOperacionDocs();
},

// Persiste el cambio dentro del blob de localStorage
persistOperacionDocs(){
  try{
    const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
    const tipo = this.selected?.tipo;
    const id   = this.selected?.id;
    if (!data?.state?.instructionsByType?.[tipo]) return;
    const list = data.state.instructionsByType[tipo];
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return;
    // guarda tal cual curr.docsOperacion
    list[i].docsOperacion = Array.isArray(this.curr.docsOperacion) ? this.curr.docsOperacion : [];
    localStorage.setItem('instruccionesData', JSON.stringify(data));
  }catch(e){ console.error(e); }
},

  // --- Agregar doc a la FILA ACTIVA por etiqueta ---
  addOperacionDocFromLabel() {
    const i = this.getActiveRowIdx();
    if (i === -1) return;
    this.ensureRowDocsOperacion(i);

    const name = (this.ui.newDocOpName || '').trim();
    if (!name) return;

    this.curr.detalle[i].docsOperacion.push({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID()
          : ('id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10)),
      label: name,
      fileName: '',
      file: null,
      url: null
    });
    this.ui.newDocOpName = '';
    this.persistOperacionDocsForRow(i);
  },

isFileAllowedOp(file) {
  if (!file) return false;
  const mimes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return mimes.includes(file.type) || ['pdf','xls','xlsx'].includes(ext);
},

  // --- Subir archivo para un doc de la FILA ACTIVA ---
  onFileOperacion(ev, doc) {
    const i = this.getActiveRowIdx();
    if (i === -1) return;
    const f = ev.target.files?.[0];
    if (!f) return;

    const mimes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    const ok  = mimes.includes(f.type) || ['pdf','xls','xlsx'].includes(ext);
    if (!ok) { alert('Solo PDF o Excel'); ev.target.value = ''; return; }

    doc.file = f;
    doc.fileName = f.name;
    doc.url = URL.createObjectURL(f);
    this.persistOperacionDocsForRow(i);
  },

  // --- Quitar archivo del doc (FILA ACTIVA) ---
  clearOperacionFile(doc) {
    const i = this.getActiveRowIdx();
    if (i === -1) return;
    doc.file = null; doc.fileName = ''; doc.url = null;
    this.persistOperacionDocsForRow(i);
  },

  // --- Eliminar doc de la FILA ACTIVA ---
  removeOperacionDoc(docIdx) {
    const i = this.getActiveRowIdx();
    if (i === -1) return;
    this.curr.detalle[i].docsOperacion.splice(docIdx, 1);
    this.persistOperacionDocsForRow(i);
  },
confirmDeleteOperacionDoc(idx) {
  // índice de la fila activa
  const i = (typeof this.getActiveRowIdx === 'function')
    ? this.getActiveRowIdx()
    : (this.ui?.activeRowIdx ?? -1);

  if (!(i >= 0)) return;
  const row = this.curr?.detalle?.[i];
  if (!row || !Array.isArray(row.docsOperacion)) return;

  if (!confirm('¿Quitar este sustento?')) return;

  row.docsOperacion.splice(idx, 1);

  // Persistir
  if (typeof this.persistOperacionDocsForRow === 'function') {
    this.persistOperacionDocsForRow(i);
  } else {
    // Fallback: persistir directo en localStorage
    try {
      const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
      const tipo = this.selected?.tipo;
      const id   = this.selected?.id;
      const list = data?.state?.instructionsByType?.[tipo] || [];
      const instIdx = list.findIndex(x => x.id === id);
      if (instIdx !== -1 && Array.isArray(list[instIdx].detalle) && list[instIdx].detalle[i]) {
        list[instIdx].detalle[i].docsOperacion = row.docsOperacion;
        localStorage.setItem('instruccionesData', JSON.stringify(data));
      }
    } catch (e) { console.error(e); }
  }
},


persistOperacionDocs() {
  try {
    const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
    const tipo = this.selected?.tipo;
    const id   = this.selected?.id;
    if (!data?.state?.instructionsByType?.[tipo]) return;
    const list = data.state.instructionsByType[tipo];
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return;
    list[i].docsOperacion = Array.isArray(this.curr.docsOperacion) ? this.curr.docsOperacion : [];
    localStorage.setItem('instruccionesData', JSON.stringify(data));
  } catch(e) { console.error(e); }
},

// Devuelve el índice activo si es válido; si no, -1
  getActiveRowIdx() {
    const list = this.curr?.detalle || [];
    const i = this.ui.activeRowIdx ?? -1;
    return (i >= 0 && i < list.length) ? i : -1;
  },

    // --- Asegura slot docsOperacion en la fila i ---
  ensureRowDocsOperacion(i) {
    const list = this.curr?.detalle || [];
    if (!(i >= 0 && i < list.length)) return;
    if (!Array.isArray(list[i].docsOperacion)) {
      // crear array vacío y persistir
      this.$set ? this.$set(list[i], 'docsOperacion', []) : (list[i].docsOperacion = []);
      this.persistOperacionDocsForRow(i);
    }
  },

    // --- Persistir SOLO la fila i al localStorage ---
  persistOperacionDocsForRow(i) {
    try {
      const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
      const tipo = this.selected?.tipo;
      const id   = this.selected?.id;
      if (!data?.state?.instructionsByType?.[tipo]) return;
      const list = data.state.instructionsByType[tipo];
      const instIdx = list.findIndex(x => x.id === id);
      if (instIdx === -1) return;

      // guarda docsOperacion de la fila i
      const det = list[instIdx].detalle || [];
      if (!(i >= 0 && i < det.length)) return;
      det[i].docsOperacion = (this.curr.detalle[i].docsOperacion || []);
      localStorage.setItem('instruccionesData', JSON.stringify(data));
    } catch(e) { console.error(e); }
  },

  // Busca por uid (o id) y setea ui.activeRowIdx. Retorna el índice (o -1)
  setActiveRowIdxByUid(uid) {
    const list = this.curr?.detalle || [];
    const key = String(uid);
    const idx = list.findIndex(r => {
      const rid = r && (r.uid ?? r.id);
      return rid != null && String(rid) === key;
    });
    this.ui.activeRowIdx = idx; // (-1 si no lo encontró)
    return idx;
  },

  // Si el índice actual no es válido, pone 0 o -1 según haya filas
  ensureActiveRowIdxValid() {
    if (this.getActiveRowIdx() === -1) {
      this.ui.activeRowIdx = (this.curr?.detalle?.length ? 0 : -1);
    }
  },
  // --- Cartas: helpers por ABONO activo ---
activeRowCartas() {
  const i = this.getActiveRowIdx();
  const row = (i >= 0) ? this.curr?.detalle?.[i] : null;
  return Array.isArray(row?.cartas) ? row.cartas : [];
},
ensureRowCartas(i) {
  const list = this.curr?.detalle || [];
  if (!(i >= 0 && i < list.length)) return;
  if (!Array.isArray(list[i].cartas)) {
    this.$set ? this.$set(list[i], 'cartas', []) : (list[i].cartas = []);
    this.persistCartasForRow(i);
  }
},
persistCartasForRow(i) {
  try {
    const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
    const tipo = this.selected?.tipo;
    const id   = this.selected?.id;
    if (!data?.state?.instructionsByType?.[tipo]) return;
    const list = data.state.instructionsByType[tipo];
    const instIdx = list.findIndex(x => x.id === id);
    if (instIdx === -1) return;

    const det = list[instIdx].detalle || [];
    if (!(i >= 0 && i < det.length)) return;

    // guarda cartas de la fila i (y bandera hasCarta)
    const cartas = Array.isArray(this.curr.detalle[i].cartas) ? this.curr.detalle[i].cartas : [];
    det[i].cartas  = cartas;
    det[i].hasCarta = cartas.length > 0;
    // compat: última carta rápida
    det[i].carta = cartas.length ? { ...cartas[cartas.length - 1] } : undefined;

    localStorage.setItem('instruccionesData', JSON.stringify(data));
  } catch(e) { console.error(e); }
},

// Subir archivo firmado para una carta específica
onUploadCartaFirmada(ev, carta) {
  const i = this.getActiveRowIdx();
  if (i === -1 || !carta) return;

  const f = ev.target.files?.[0];
  if (!f) return;

  // valida PDF únicamente (ajusta si quieres permitir xls/xlsx)
  const ok = f.type === 'application/pdf' || (f.name.toLowerCase().endsWith('.pdf'));
  if (!ok) { alert('Solo PDF'); ev.target.value=''; return; }

  carta.signedFileName = f.name;
  carta.signedFile     = f;
  carta.signedUrl      = URL.createObjectURL(f);
  carta.signedAtISO    = new Date().toISOString();
  this.persistCartasForRow(i);
},

// Confirmar carta (marcar estado)
confirmCarta(carta) {
  const i = this.getActiveRowIdx();
  if (i === -1 || !carta) return;
  carta.confirmada   = true;
  carta.confirmedISO = new Date().toISOString();
  this.persistCartasForRow(i);
},

// Quitar archivo firmado (no borra la carta)
clearCartaFirmada(carta) {
  const i = this.getActiveRowIdx();
  if (i === -1 || !carta) return;
  carta.signedFileName = '';
  carta.signedFile     = null;
  carta.signedUrl      = null;
  carta.signedAtISO    = null;
  this.persistCartasForRow(i);
},

// Eliminar carta (de la lista)
removeCarta(idx) {
  const i = this.getActiveRowIdx();
  const list = this.curr?.detalle || [];
  if (!(i >= 0 && i < list.length)) return;
  const arr = Array.isArray(list[i].cartas) ? list[i].cartas : [];
  if (!(idx >= 0 && idx < arr.length)) return;

  if (!confirm('¿Eliminar esta carta?')) return;
  arr.splice(idx, 1);
  this.persistCartasForRow(i);
},

// CONFIRMAR el ABONO ACTIVO (null-safe + persiste solo la fila)
confirmAbono() {
  const i   = this.getActiveRowIdx?.() ?? -1;
  const row = (i >= 0) ? this.curr?.detalle?.[i] : null;
  if (!row) return;

  const now = new Date().toISOString();
  row.estadoAbono   = 'CONFIRMADO';
  row.estadoAbonoAt = now;
  // flags de compatibilidad
  row.abonoConfirmado = true;
  row.confirmado = true;

  if (typeof this.persistRowFragment === 'function') {
    this.persistRowFragment(i, {
      estadoAbono: row.estadoAbono,
      estadoAbonoAt: row.estadoAbonoAt,
      abonoConfirmado: true,
      confirmado: true
    });
  } else {
    // Fallback directo a instruccionesData
    try {
      const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
      const tipo = this.selected?.tipo, id = this.selected?.id;
      const list = data?.state?.instructionsByType?.[tipo] || [];
      const instIdx = list.findIndex(x => x.id === id);
      if (instIdx !== -1) {
        const det = list[instIdx].detalle || [];
        if (i >= 0 && i < det.length) {
          det[i] = {
            ...(det[i] || {}),
            estadoAbono: 'CONFIRMADO',
            estadoAbonoAt: now,
            abonoConfirmado: true,
            confirmado: true,
            comision: this.activeRow.comision
          };
          localStorage.setItem('instruccionesData', JSON.stringify(data));
        }
      }
    } catch (e) { console.error(e); }
  }
},

// ¿ESTÁ CONFIRMADO el ABONO? (acepta fila o índice; null-safe)
isAbonoConfirmado(rowOrIdx) {
  // resolver fila
  let row = null;
  if (rowOrIdx != null && typeof rowOrIdx === 'object') {
    row = rowOrIdx;
  } else if (Number.isInteger(rowOrIdx)) {
    const det = this.curr?.detalle || [];
    row = (rowOrIdx >= 0 && rowOrIdx < det.length) ? det[rowOrIdx] : null;
  } else {
    // por defecto, usa el abono ACTIVO
    const i = this.getActiveRowIdx?.() ?? -1;
    row = (i >= 0) ? this.curr?.detalle?.[i] : null;
  }
  if (!row) return false;

  // normaliza estado
  const st = (row.estadoAbono ?? row.estado ?? '')
    .toString().trim().toUpperCase();

  // flags de compatibilidad
  const flag =
    row.abonoConfirmado === true ||
    row.confirmado === true;

  return st === 'CONFIRMADO' || flag;
},

  toastSuccess(msg = 'Operación exitosa') {
    Toast.fire({ icon: 'success', title: msg });
  },
  toastInfo(msg = 'Información') {
    Toast.fire({ icon: 'info', title: msg });
  },
  toastWarn(msg = 'Revisar datos') {
    Toast.fire({ icon: 'warning', title: msg });
  },
  toastError(msg = 'Ocurrió un error') {
    Toast.fire({ icon: 'error', title: msg });
  },

  _parseMoney(v) {
  if (v == null || v === '') return 0;
  // acepta números, strings con separadores, y el valor de v-money
  const s = String(v).replace(/\s/g, '').replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
},
async loadTiposTransaccion() {
    try {
      // Ajusta la ruta si corresponde
      const res = await fetch('json/tipos-transaccion.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);

      const tipos = await res.json();            // se espera [{ descripcion, categoria, ... }, ...]
      this.tiposTransferencia = Array.isArray(tipos) ? tipos : [];

      // Construye master.types SIEMPRE desde el JSON (ignora LS)
      const types = [...new Set(
        this.tiposTransferencia
          .map(t => t?.descripcion)
          .filter(Boolean)
          .map(s => String(s).trim())
      )];

      this.master.types = types;

      // (Opcional) Persistir en el blob de instruccionesData
      try {
        const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
        data.master = { ...(data.master || {}), types };
        localStorage.setItem('instruccionesData', JSON.stringify(data));
      } catch (e) {
        console.warn('No se pudo persistir master.types en LS:', e);
      }
    } catch (err) {
      console.error('No se pudo cargar tipos-transaccion.json:', err);
      this.tiposTransferencia = [];
      this.master.types = []; // o deja lo que hubiera si prefieres
    }
  },

  // Normaliza y muestra el texto “bonito” del tipo
displayTipoTrx(v) {
  if (v == null || v === '') return '—';
  return String(v).trim(); // aquí podrías mapear a un label distinto si quisieras
},

// Devuelve la categoría (Ingreso/Egreso/otro) del tipo, null-safe
categoriaTipoTrx(trx) {
  const list = Array.isArray(this.tiposTransferencia) ? this.tiposTransferencia : [];
  if (trx == null) return null;

  const key = String(trx).trim().toLowerCase();
  const item = list.find(e =>
    String(e?.descripcion ?? '').trim().toLowerCase() === key ||
    String(e?.categoria ?? '').trim().toLowerCase() === key // por si master.types usa 'categoria'
  );

  return item?.categoria ?? null;
},

// Cuando el usuario cambia el tipo en el select del abono activo
onChangeTipoTransferencia() {
  const i   = this.getActiveRowIdx?.() ?? -1;
  const row = (i >= 0) ? this.curr?.detalle?.[i] : null;
  if (!row) return;

  // Derivar/actualizar campo de categoría (si lo quieres guardar también)
  row.categoriaTipo = this.categoriaTipoTrx(row.tipoTransferencia) || null;

  // Persistir SOLO esta fila con tu helper si existe
  if (typeof this.persistRowFragment === 'function') {
    this.persistRowFragment(i, {
      tipoTransferencia: row.tipoTransferencia ?? null,
      categoriaTipo: row.categoriaTipo ?? null
    });
  } else {
    // Fallback: persistencia directa en instruccionesData
    try {
      const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
      const tipo = this.selected?.tipo;
      const id   = this.selected?.id;
      const list = data?.state?.instructionsByType?.[tipo] || [];
      const instIdx = list.findIndex(x => x.id === id);
      if (instIdx !== -1) {
        const det = list[instIdx].detalle || [];
        if (i >= 0 && i < det.length) {
          det[i] = {
            ...(det[i] || {}),
            tipoTransferencia: row.tipoTransferencia ?? null,
            categoriaTipo: row.categoriaTipo ?? null
          };
          localStorage.setItem('instruccionesData', JSON.stringify(data));
        }
      }
    } catch (e) { console.error(e); }
  }
}





  }
});


// Registra la directiva global
app.directive('money', MoneyDirective);

// Activa detección en DevTools
app.config.devtools = true;

// Muestra warnings en consola
app.config.warnHandler = (msg, vm, trace) => {
  console.warn(`[Vue warning]: ${msg}\nTrace: ${trace}`);
};

app.config.errorHandler = (err, vm, info) => {
  console.error(`[Vue error]: ${info}`, err);
};


app.mount("#app");
