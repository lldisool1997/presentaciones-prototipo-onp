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

// Polyfill defensivo para CSS.escape (por si el browser no lo trae)
if (typeof CSS === 'undefined' || typeof CSS.escape !== 'function') {
  window.CSS = window.CSS || {};
  CSS.escape = CSS.escape || function (s) {
    return String(s).replace(/[^a-zA-Z0-9_\-]/g, ch => '\\' + ch);
  };
}

// === Directiva global: v-tomselect ===
const TomSelectDirective = {
  mounted(el, binding) {
    // Opciones por defecto + override vía v-tomselect="{ ... }"
    const opts = {
      maxOptions: 500,
      allowEmptyOption: true,
      create: false,
      placeholder: (binding?.value && binding.value.placeholder) || 'Seleccione…',
      // Si estás en modal, fija el contenedor del dropdown
      dropdownParent: (el.closest('.p-dialog, .modal') || document.body),
      onChange(val) {
        // Sincroniza con v-model (no dispara loops)
        el.value = (val ?? '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      },
    };

    // Inicializar instancia
    const ts = new TomSelect(el, opts);
    el._ts = ts;

    // Valor inicial: solo si existe en <option>, sino deja placeholder
    const initial = (el.value ?? '').toString().trim();
    const exists = !!(initial && el.querySelector(`option[value="${CSS.escape(initial)}"]`));
    if (exists) ts.setValue(initial, true); else ts.clear(true);

    // Observer para opciones dinámicas: refresca sin perder selección
    const mo = new MutationObserver(() => {
      const val = (el.value ?? '').toString().trim();
      ts.refreshOptions(false);
      const ok = !!(val && el.querySelector(`option[value="${CSS.escape(val)}"]`));
      if (ok && ts.getValue() !== val) ts.setValue(val, true);
      if (!ok) ts.clear(true);
    });
    mo.observe(el, { childList: true, subtree: true });
    el._tsObserver = mo;

    // Respeta el disabled inicial de Vue
    if (el.disabled) ts.disable();
  },

  updated(el) {
    const ts = el._ts;
    if (!ts) return;

    // Sincroniza disabled/enabled
    if (el.disabled) ts.disable(); else ts.enable();

    // Re-sincroniza valor tras updates de Vue (tabs, async, etc.)
    const val = (el.value ?? '').toString().trim();
    const exists = !!(val && el.querySelector(`option[value="${CSS.escape(val)}"]`));
    if (exists) {
      if (ts.getValue() !== val) ts.setValue(val, true);
    } else {
      ts.clear(true); // placeholder si no hay valor
    }
    ts.refreshOptions(false);
  },

  unmounted(el) {
    try { el._tsObserver?.disconnect(); } catch {}
    try { el._ts?.destroy(); } catch {}
    delete el._tsObserver;
    delete el._ts;
  }
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
      modalVisible: false,
      iframeSrc: '',
      fileExtension: '',
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

    initTomSelect(el, options = {}) {
  if (!el) return;
  if (el.tomselect) el.tomselect.destroy(); // limpia si ya existe

  const select = new TomSelect(el, {
    create: false,
    maxOptions: 100,
    placeholder: 'Seleccione una opción',
    allowEmptyOption: true,
    ...options,
    onChange: (val) => {
      // sincroniza con Vue
      const event = new Event('input', { bubbles: true });
      el.value = val;
      el.dispatchEvent(event);
    },
  });
}
,
    
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
  if (this.isAbonoConfirmado()) { ev.target.value = ''; return; }
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
// Eliminar carta (de la lista) con Swal + toast
async removeCarta(idx) {
  const i   = this.getActiveRowIdx?.() ?? -1;
  const row = (i >= 0) ? this.curr?.detalle?.[i] : null;
  if (!row) return;

  const arr = Array.isArray(row.cartas) ? row.cartas : [];
  if (!(idx >= 0 && idx < arr.length)) return;

  // 1) Confirmación (solo Swal)
  const res = await Swal.fire({
    title: '¿Eliminar esta carta?',
    text: 'Esta acción quitará la carta del abono.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusCancel: true
  });
  if (!res.isConfirmed) {
    this.toastInfo?.('Eliminación cancelada');
    return;
  }

  // 2) Eliminar y persistir
  try {
    arr.splice(idx, 1);

    if (typeof this.persistCartasForRow === 'function') {
      this.persistCartasForRow(i); // ya persiste row.cartas actualizado
    } else {
      // Fallback directo a localStorage
      const data = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
      const tipo = this.selected?.tipo, id = this.selected?.id;
      const list = data?.state?.instructionsByType?.[tipo] || [];
      const instIdx = list.findIndex(x => x.id === id);
      if (instIdx !== -1 && Array.isArray(list[instIdx].detalle) && list[instIdx].detalle[i]) {
        list[instIdx].detalle[i].cartas = arr;
        localStorage.setItem('instruccionesData', JSON.stringify(data));
      }
    }

    // 3) Toast de éxito
    this.toastSuccess?.('Carta eliminada');
  } catch (e) {
    console.error(e);
    this.toastError?.('No se pudo eliminar la carta');
  }
},


// CONFIRMAR el ABONO ACTIVO (null-safe + persiste solo la fila)
async confirmAbono() {
  const i   = this.getActiveRowIdx?.() ?? -1;
  const row = (i >= 0) ? this.curr?.detalle?.[i] : null;
  if (!row) return;

  // 1) VALIDACIÓN → SOLO TOASTS (nada de Swal aquí)
  const { ok, errors } = this.validateAbonoListo(row);
  if (!ok) {
    // Muestra motivos en toast (tu toastWarn / toastError)
    this.toastWarn('Antes de confirmar:\n• ' + errors.join('\n• '));
    return;
  }

  // 2) CONFIRMACIÓN → SOLO SWAL (sin éxito/fracaso aquí)
  const res = await Swal.fire({
    title: '¿Confirmar abono?',
    text: 'Esta acción registrará el abono como CONFIRMADO.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, confirmar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    focusCancel: true
  });
  if (!res.isConfirmed) {
    this.toastInfo?.('Confirmación cancelada'); // opcional
    return;
  }

  // 3) PERSISTIR → y al final SOLO TOAST de éxito
  const now = new Date().toISOString();
  row.estadoAbono     = 'CONFIRMADO';
  row.estadoAbonoAt   = now;
  row.abonoConfirmado = true;  // compat
  row.confirmado      = true;  // compat

  if (typeof this.persistRowFragment === 'function') {
    this.persistRowFragment(i, {
      estadoAbono: 'CONFIRMADO',
      estadoAbonoAt: now,
      abonoConfirmado: true,
      confirmado: true,
      comision: this.activeRow?.comision ?? null
    });
  } else {
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
            comision: this.activeRow?.comision ?? null
          };
          localStorage.setItem('instruccionesData', JSON.stringify(data));
        }
      }
    } catch (e) { console.error(e); }
  }

  this.toastSuccess('Abono confirmado');
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
},
// --- VALIDACIONES DE CONFIRMACIÓN ---
hasCartasPendientes(row) {
  const cartas = Array.isArray(row?.cartas) ? row.cartas : [];
  return cartas.some(c => c?.confirmada !== true);
},

hasSustentosPendientes(row) {
  const docs = Array.isArray(row?.docsOperacion) ? row.docsOperacion : [];
  // si no hay docs, no hay pendientes
  if (docs.length === 0) return false;
  // si hay docs, TODOS deben tener un archivo adjunto (fileName o url)
  return docs.some(d => !((d?.fileName && String(d.fileName).trim() !== '') || d?.url));
},

isTipoTransferenciaSet(row) {
  const v = row?.tipoTransferencia;
  return v != null && String(v).trim() !== '';
},

validateAbonoListo(row) {
  const errors = [];
  if (!this.isTipoTransferenciaSet(row)) errors.push('Falta seleccionar el tipo de transacción.');
  if (this.hasSustentosPendientes(row)) errors.push('Hay sustentos del abono sin archivo adjunto.');
  if (this.hasCartasPendientes(row))    errors.push('Existen cartas sin confirmar.');
  return { ok: errors.length === 0, errors };
},




openViewer(fileName) {
  // Obtener la extensión del archivo
  const extension = fileName.split('.').pop().toLowerCase();
  this.fileExtension = extension;

  // Si es PDF, usamos Google Docs Viewer para abrirlo
  if (extension === 'pdf') {
    // Ruta al archivo PDF público usando Google Docs Viewer
    this.iframeSrc = `https://docs.google.com/viewer?url=https://www.orimi.com/pdf-test.pdf&embedded=true`;
  } else if (extension === 'xls' || extension === 'xlsx') {
    // Ruta al archivo Excel público (usando Office Online Viewer)
     this.iframeSrc = `https://view.officeapps.live.com/op/embed.aspx?src=https://cmapspublic2.ihmc.us/rid%3D1PPCPHPNS-ZV0LZT-2WDF/Planilla`;
  }

  // Mostrar el modal con el visor
  this.modalVisible = true;  // Mostrar el modal
},


        closeModal() {
          this.modalVisible = false;  // Cerrar el modal
          this.iframeSrc = '';        // Limpiar la fuente del iframe
        },
        // Método para obtener las opciones de moneda
getMonedas() {
  const list = Array.isArray(this.master?.monedas)
    ? this.master.monedas
    : ['PEN', 'USD'];
  return list;
},

  // Método para obtener las cuentas de abono
  getCuentasAbono() {
    // Deberías tener las cuentas en tu objeto master o como dato
    return this.master?.cuentas?.filter(cuenta => cuenta.tipo === 'abono') || [];
  },

  // Método para obtener las cuentas de cargo
  getCuentasCargo() {
    // Deberías tener las cuentas en tu objeto master o como dato
    return this.master?.cuentas?.filter(cuenta => cuenta.tipo === 'cargo') || [];
  },

  // Método para obtener las opciones de tipos de transferencia
  getTiposTransferencia() {
    return this.tiposTransferencia || [];
  },

  // Agregar comisión al activeRow
  // Agregar comisión al activeRow
addComision(activeRow) {
  if (!activeRow.detalle) {
    activeRow.detalle = [];
  }

  // Obtener todas las unidades disponibles (de tu helper actual)
  const unidades = this.getUnidadesDeNegocio();

  // Obtener la unidad de negocio usada en la comisión anterior (si hay)
  const ultimaUnidad =
    activeRow.detalle.length > 0
      ? activeRow.detalle[activeRow.detalle.length - 1].unidadNegocio
      : null;

  // Buscar una unidad diferente
  const nuevaUnidad =
    unidades.find(u => u !== ultimaUnidad) ||
    this.curr?.unidad ||
    activeRow.unidadNegocio ||
    '';

  // Crear la nueva comisión
  const detailComision = {
    uid: genId(),
    unidadNegocio: nuevaUnidad, // 👈 diferente a la anterior
    personaId: activeRow.personaId || '',
    tipoTransaccion: activeRow.tipoTransaccion || '',
    cuentaId: '',
    categoriaTipo: activeRow.categoriaTipo || '',
    moneda: this.getMonedas().find(m => m === activeRow.moneda) || 'PEN',
    monto: 0,
    comision: 0,
    descripcion: 'Comisión de operación',
  };

  // Asignar cuentas
  const cuentaAbono =
    this.getCuentasAbono().find(c => c.id === activeRow.cuentaCabeceraId) || {
      alias: 'Cuenta Abono',
      numero: '—',
    };
  const cuentaCargo =
    this.getCuentasCargo().find(c => c.id === activeRow.cuentaId) || {
      alias: 'Cuenta Cargo',
      numero: '—',
    };

  detailComision.cuentaAbono = cuentaAbono;
  detailComision.cuentaCargo = cuentaCargo;

  // Asignar tipo de transferencia
  /*const tipos = this.getTiposTransferencia();
  const tipoTransferencia =
    tipos.find(t => t.descripcion === activeRow.tipoTransferencia) || {
      descripcion: 'Ingreso',
      categoria: 'Egreso',
    };
  detailComision.tipoTransaccion = tipoTransferencia.descripcion;*/

  this.setCuentaPorUnidadOPersona(detailComision)

  // Agregar al array
  activeRow.detalle.push(detailComision);
},



  // === Métodos para selects dependientes ===
// === Unidades de negocio (dedup + sin nulos) ===
getUnidadesDeNegocio(detalle) {
  const arr = [
    this.curr?.unidad,
    this.activeRow?.unidadNegocio,
  ].filter(v => v != null && v !== '');
  return [...new Set(arr)];
},

// === Personas (dedup + sin nulos) ===
getPersonas() {
  const arr = [
    this.curr?.personaId,
    this.activeRow?.personaId,
  ].filter(v => v != null && v !== '');
  return [...new Set(arr)];
},

// === Cuentas por fila (filtra por unidad+persona del detalle; dedup + sin nulos) ===
getCuentas(detalle) {
  const unidad  = detalle?.unidadNegocio;
  const persona = detalle?.personaId;
  const ids = [];

  // cuenta de cabecera (curr)
  if (
    this.curr?.cuentaCabeceraId &&
    (unidad ? this.curr?.unidad === unidad : true) &&
    (persona ? this.curr?.personaId === persona : true)
  ) {
    ids.push(this.curr.cuentaCabeceraId);
  }

  // cuenta del activeRow
  if (
    this.activeRow?.cuentaId &&
    (unidad ? this.activeRow?.unidadNegocio === unidad : true) &&
    (persona ? this.activeRow?.personaId === persona : true)
  ) {
    ids.push(this.activeRow.cuentaId);
  }

  // elimina nulos/vacíos y duplicados
  let unicas = [...new Set(ids.filter(v => v != null && v !== ''))];

  let cuentas = [];

  if(this.activeRow.detalle){
    cuentas = this.activeRow.detalle.filter(e => e.uid != detalle.uid).map(e => e.cuentaId)
    unicas = unicas.filter(e => !cuentas.includes(e));
  }
  
  // mapea a { id, alias }
  return unicas.map(id => ({ id, alias: this.accountAlias(id) }));
},




// se ejecuta al cambiar unidad o persona
setCuentaPorUnidadOPersona(detalle) {
  const opciones = this.getCuentas(detalle);
  const ids = opciones.map(o => o.id);

  if (!ids.includes(detalle.cuentaId)) {
    detalle.cuentaId = opciones.length ? opciones[0].id : null;
    
    if(detalle.cuentaId){
      detalle.moneda = this.curr.moneda
      detalle.tipoTransaccion = this.getDescripcionTipoTrxPorMoneda(this.curr.moneda)
    }
  }
},

// Devuelve la descripción del tipo de transacción (comisión) según moneda
getDescripcionTipoTrxPorMoneda(moneda) {
  if (!moneda) return '';
  const m = String(moneda).trim().toUpperCase();

  switch (m) {
    case 'PEN':
      return 'Comisión Bancaria en Soles';
    case 'USD':
      return 'Comisión Bancaria en Dolares';
    default:
      return '';
  }
},

bloqueoFilaComision(){
  return this.activeRow.detalle?.length > 1;
},

removeDetalleFila(index) {
 this.activeRow.detalle.splice(index, 1);
      this.persistOperacionDocsForRow(this.getActiveRowIdx());
      this.toastSuccess('Comisión eliminada');
},






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

app.directive('tomselect', TomSelectDirective);
app.mount("#app");
