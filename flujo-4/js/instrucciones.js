const DOCS_INICIALES = [
  //{ key: 'sustentos', label: 'Documento Sustento', fileName: '', file: null },
 // { key: 'legal',  label: 'Informe Legal',       fileName: '', file: null },
 // { key: 'acta',   label: 'Acta de Comité de Inversiones', fileName: '', file: null },
];

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

const { createApp, computed } = Vue;

const app = createApp({
  data() {
    return {
      
      tiposTransferencia: null,
     master: {
        types: [],
        unidades: ["FCR-Macrofondo", "FCR-Emsal", "FCR-Paramonga"],
        bancos: ["SCOTIABANK", "BBVA", "BCP", "INTERBANK", "BN"],
         monedas: ["PEN", "USD"],


        // Personas con cuenta definida (si eliges persona, la cuenta se setea sola)
        personas: [
    // PEN
    { id: "per-001", nombre: "ONP-PENSIONES EMSAL", "bancoPreferido": "BANCO DE LA NACIÓN",   cuentaId: "cta-bbva-pen",  moneda: "PEN" },
    { id: "per-002", nombre: "ONP-PENSIONES EMSAL",  "bancoPreferido": "BANCO DE LA NACIÓN", cuentaId: "cta-bcp-pen",   moneda: "PEN" },
    { id: "per-003", nombre: "A & B ECOSISTEMAS S.R.L.", "bancoPreferido": "BN",  cuentaId: "cta-ibk-pen",   moneda: "PEN" },

    // USD
    { id: "usd-001", nombre: "ONP-PENSIONES EMSAL", "bancoPreferido": "BANCO DE LA NACIÓN",   cuentaId: "cta-bbva-usd",  moneda: "USD" },
    { id: "usd-002", nombre: "ONP-PENSIONES EMSAL", "bancoPreferido": "BANCO DE LA NACIÓN",  cuentaId: "cta-bcp-usd",   moneda: "USD" },
    { id: "usd-003", nombre: "A & B ECOSISTEMAS S.R.L.", "bancoPreferido": "BN",  cuentaId: "cta-ibk-usd",   moneda: "USD" },
  ],
  cuentas: [
    // BBVA
    { id: "cta-bbva-pen", alias: "BBVA Central PEN", numero: "001-123456", unidad: "FCR-Macrofondo",  moneda: "PEN" },
    { id: "cta-bbva-usd", alias: "BBVA Central USD", numero: "001-987654", unidad: "FCR-Macrofondo",  moneda: "USD" },

    // BCP
    { id: "cta-bcp-pen",  alias: "BCP Operaciones PEN", numero: "002-111111", unidad: "FCR-Emsal", moneda: "PEN" },
    { id: "cta-bcp-usd",  alias: "BCP Operaciones USD", numero: "002-222222", unidad: "FCR-Emsal", moneda: "USD" },

    // INTERBANK
    { id: "cta-ibk-pen",  alias: "INTERBANK Mixta PEN", numero: "003-333333", unidad: "FCR-Paramonga",   moneda: "PEN" },
    { id: "cta-ibk-usd",  alias: "INTERBANK Mixta USD", numero: "003-444444", unidad: "FCR-Paramonga",   moneda: "USD" },
  ],
  
      globalDocsExtras: [],
      },
      

            singleRowTypes: [
      //"Transferencias",
    ],

       initialDocs: [
      { key: 'sustentos', label: 'Documento Sustento', fileName: '', file: null },
      //{ key: 'legal',  label: 'Informe Legal',       fileName: '', file: null },
      //{ key: 'acta',   label: 'Acta de Comité de Inversiones', fileName: '', file: null }
    ],
    extraDocs: [], // { id, label, fileName, file }
      personaTypes: ["Habilitación de recursos"],
      lockedLayout: null, // null | 'persona' | 'unidad'
      ui: {
        selectedType: "",
        activeTab: 0, // Tab del tipo de transacción
        activeInstructionTab: null, // Instrucción activa seleccionada
        newDocName: ""
      },
      state: {
        typesAdded: [],
        instructionsByType: {} // Instrucciones agrupadas por tipo de transacción
      },

      macroCuentas: {},            // ← aquí guardaremos el JSON externo
    cuentasNormalizadas: []      // ← opcional: array plano (unidad, banco, numero)
      
    };
  },

    created() {

      
      this.loadMacroCuentasAndReplace?.();
  this.loadTiposTransaccion();
  this.loadFromLocalStorage();
  },

watch: {
  currentType() { this.applyTipoRulesForCurrent(); },
  'ui.activeTab'() { this.applyTipoRulesForCurrent(); },
  'curr.moneda'() { this.applyTipoRulesForCurrent(); }
}
,

  computed: {
      cuentasCabecera() {
    if (!this.curr) return [];
    const unidad = this.curr.unidad;
    const moneda = this.curr.moneda;
    if (!unidad || !moneda) return [];
    return this.master.cuentas.filter(c => c.unidad === unidad && c.moneda === moneda);
  },
   personasFiltradas() {
    if (!this.curr || !this.curr.moneda) return this.master.personas;
    return this.master.personas.filter(p => p.moneda === this.curr.moneda);
  },

currentType() {
  return this.state.typesAdded[this.ui.activeTab];
},
isPersonaLayout() {
  return this.personaTypes.includes(this.currentType);
},



async focusPersona(uid) {
  await this.$nextTick();
  const el = this.$refs?.[`personaSel_${uid}`];
  // Si la ref es un array (v-for), toma el primero
  const node = Array.isArray(el) ? el[0] : el;
  if (node && node.focus) node.focus();
},

cuentasPara() {
    // Devuelve una función para usar con la fila `r`
    return (row) => {
      const moneda = this.curr?.moneda;
      if (!moneda) return [];

      if (this.lockedLayout === 'persona') {
        // Modo PERSONA: la cuenta viene de la persona PERO debe calzar con la moneda
        const p = this.master.personas.find(x => x.id === row.personaId);
        if (!p) return [];
        const c = this.master.cuentas.find(x => x.id === p.cuentaId && x.moneda === moneda);
        return c ? [c] : [];
      }

      // Modo UNIDAD: filtra por unidad y por moneda
      if (!row.unidadNegocio) return [];
      return this.master.cuentas.filter(c => c.unidad === row.unidadNegocio && c.moneda === moneda);
    };
  },

// Totales
totalFilas() {
  return this.curr?.detalle?.length || 0;
},
totalMonto() {
  if (!this.curr || !Array.isArray(this.curr.detalle)) return 0;
  return this.curr.detalle.reduce((acc, r) => {
    const n = parseFloat(String(r.monto || "0").replace(/[, ]/g, ""));
    return acc + (isNaN(n) ? 0 : n);
  }, 0);
},
totalMontoFormateado() {
  return this.totalMonto.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
},

    // Obtiene la instrucción activa del tipo de transacción seleccionado
    curr() {
      const currentType = this.state.typesAdded[this.ui.activeTab];
      const currentInstructionIdx = this.ui.activeInstructionTab;

      if (currentInstructionIdx !== null && this.state.instructionsByType[currentType]) {
        return this.state.instructionsByType[currentType][currentInstructionIdx] || null;
      }
      return null;
    },
    // Cuenta de instrucciones aprobadas
    approvedCount() {
      return this.curr ? this.curr.detalle.filter(i => i.aprob).length : 0;
    },
    // --- Instrucciones (nivel INSTRUCCIÓN) ---
approvedInstrCount() {
  const t = this.state.typesAdded[this.ui.activeTab];
  const list = this.state.instructionsByType[t] || [];
  return list.filter(ins => !!ins.aprobado).length;
},
totalInstrCount() {
  const t = this.state.typesAdded[this.ui.activeTab];
  const list = this.state.instructionsByType[t] || [];
  return list.length;
},

// --- Detalles (nivel FILA) ---
approvedRowsCount() {
  if (!this.curr || !Array.isArray(this.curr.detalle)) return 0;
  return this.curr.detalle.filter(r => !!r.aprob).length;
},

  isSingleRowType() {
    const t = this.state.typesAdded[this.ui.activeTab];
    return this.singleRowTypes.includes(t);
  },

   currentType() {
    return this.state.typesAdded[this.ui.activeTab] || '';
  },
  showPersonaCol() {
    const t = this.currentType;
    if (!t) return false;
    const meta = this.state.tiposByDesc?.[String(t).trim().toLowerCase()];
    return !!meta?.tienePersona;
  },
  showUnidadCol() {
    return !this.showPersonaCol;
  },
   isInstructionLocked() {
    const curr = this.curr;
    return !!(curr && curr.aprobado === true);
  },

  },

  methods: {
    getCodigoTipoTrx(trx) {
      const list = Array.isArray(this.tiposTransferencia) ? this.tiposTransferencia : [];
      if (trx == null) return null;

      const key = String(trx).trim().toLowerCase();
      const item = list.find(e =>
        String(e?.descripcion ?? '').trim().toLowerCase() === key
      );

      return item?.codigo ?? null;
    },
    isDocSelected(id) {
  const ins = this.currentIns();
  return !!ins?.docsGlobalSeleccionados?.some(d => d.id === id);
},
    
    // Genera un ID único
    uid() { return Math.random().toString(36).slice(2); },
    

    // Agrega un tipo de transacción
    addType() {
  const t = this.ui.selectedType;
  if (!t){
      Toast.fire({
    icon: 'warning',
    title: `Debe seleccionar un tipo de transacción`
  });
   return;
  }

  // Verifica si el tipo ya fue agregado
  if (this.state.typesAdded.includes(t)) {
    Toast.fire({
      icon: 'warning',
      title: `El tipo "${t}" ya ha sido agregado`
    });
    return; // 🔹 evita que se agregue de nuevo
  }

  // Si no existe, lo agrega normalmente
  this.state.typesAdded.push(t);
  this.state.instructionsByType[t] = []; // Inicializa el grupo de instrucciones
  this.addInstruction(t); // Crea la primera instrucción automáticamente
  this.ui.selectedType = "";

  // Notifica éxito
  Toast.fire({
    icon: 'success',
    title: `Tipo "${t}" agregado correctamente`
  });
},


    // Agrega una instrucción dentro del tipo de transacción
addInstruction(type) {
  if (!this.state.instructionsByType[type]) {
    this.state.instructionsByType[type] = [];
  }
  const ins = this.newInstruction();
  this.state.instructionsByType[type].push(ins);
  this.ui.activeInstructionTab = this.state.instructionsByType[type].length - 1;

  // si no hay filas, crea una
  if (!Array.isArray(ins.detalle) || ins.detalle.length === 0) {
    const row = {
      uid: this.uid(),
      personaId: "",
      unidadNegocio: this.ui.selectedUN,
      cuentaId: "",
      monto: "",
      aprob: false
    };
    ins.detalle.push(row);
  }

  // aplica reglas del tipo (persona/unidad) y enfoca si aplica
  this.applyTipoRulesForCurrent();
},


    // Crea una nueva instrucción
newInstruction() {
  return {
    id: this.uid(),
    descripcion: "",
    producto: "",
    unidad: "",
    cuentaCabeceraId: "", // 👈 nueva
    fecha: new Date().toISOString().slice(0, 10),
    moneda: "PEN",
    importe: "",
    aprobado: false,

      // 👇 documentos a nivel de instrucción
    docsIniciales: DOCS_INICIALES.map(d => ({ ...d })), // copia por instrucción
    docsExtras: [], // { id, label, fileName, file }

    detalle: [],
    docs: [],
    docsGlobalSeleccionados: [],
  };
},



    // Guarda las instrucciones (solo demo)
guardarTodo() {
  const type = this.state.typesAdded[this.ui.activeTab];
  const list = this.state.instructionsByType[type] || [];

  // Normaliza docs: solo metadata
  const instructions = list.map((ins) => ({
    id: ins.id,
    tipo: type,
    fecha: ins.fecha || '',
    moneda: ins.moneda || '',
    importe: ins.importe || '',
    descripcion: ins.descripcion || '',
    detalle: Array.isArray(ins.detalle) ? ins.detalle : [],
    docs: this.collectDocsOf(ins).map(d => ({
      id: d.id ?? d.key ?? crypto.randomUUID(),
      tipo: d.tipo || 'inicial',
      label: d.label || 'Documento',
      fileName: d.fileName || '',
      url: d.url || null
    }))
  }));

  // Si aún no tienes backend, solo log y persistencia local
  console.log('Payload a enviar (solo metadata):', { instructions });

  // Si vas a llamar backend:
  /*
  fetch('/api/instrucciones/guardar-lote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions })
  })
  .then(r => r.ok ? r.json() : Promise.reject(r))
  .then(() => this.toastSuccess('Listo para enviar'))
  .catch(() => this.toastError('No se pudo enviar'));
  */

  this.toastSuccess('Listo para enviar');
  this.saveToLocalStorage();
}
,


    // Elimina una instrucción
    eliminarInstruccion(instructionIdx) {
      const currentType = this.state.typesAdded[this.ui.activeTab];
      if (this.state.instructionsByType[currentType]) {
        this.state.instructionsByType[currentType].splice(instructionIdx, 1);
        if (this.ui.activeInstructionTab >= instructionIdx) {
          // Si eliminamos la instrucción activa, la desplazamos al índice anterior o al primero
          this.ui.activeInstructionTab = Math.max(0, this.ui.activeInstructionTab - 1);
        }
      }
    },

    // Agregar una fila en la tabla de detalles de una instrucción
agregarFila() {
  const ins = this.curr;
  if (!ins) return;
  if (!Array.isArray(ins.detalle)) ins.detalle = [];

  if (this.isSingleRowType && ins.detalle.length >= 1) {
    Toast.fire({ icon: 'warning', title: 'Este tipo solo permite una fila' });
    return;
  }

  const row = {
    uid: this.uid(),
    personaId: "",
    unidadNegocio: "",
    cuentaId: "",
    monto: "",
    aprob: false
  };
  ins.detalle.push(row);

  // si el tipo es por persona → enfoca el select de persona de esta fila
  if (this.isPersonaType(this.currentType)) {
    this.enforceLayout('persona');
    this.focusPersona(row.uid);
  }
},

eliminarFila(idx) {
  const ins = this.curr;
  if (this.isSingleRowType && ins.detalle.length <= 1) {
    Toast.fire({ icon: 'warning', title: 'Debe permanecer al menos 1 fila' });
    return;
  }
  ins.detalle.splice(idx, 1);
},

    // Manejar la subida de archivos
    onFile(ev) {
      const f = ev.target.files?.[0];
      if (!f) return;
      const currentType = this.state.typesAdded[this.ui.activeTab];
      const currentInstruction = this.state.instructionsByType[currentType][this.ui.activeInstructionTab];
      currentInstruction.docs.push({ id: this.uid(), nombre: f.name });
      ev.target.value = "";
    },

    /*

    onChangePersona(row) {
  // Cuando cambia la persona, setea automáticamente la cuenta y bloquea el select de cuenta
  const p = this.master.personas.find(x => x.id === row.personaId);
  row.cuentaId = p?.cuentaId || "";
},*/

// Forzar modo y aplicar reglas a todas las filas
enforceLayout(layout) {
  this.lockedLayout = layout; // 'persona' | 'unidad'

  // Recorre todas las filas de la instrucción activa
  const list = this.curr?.detalle || [];
  for (const r of list) {
    if (layout === 'persona') {
      // Al ir a persona: limpia unidad, fija cuenta por persona (si hay persona)
      r.unidadNegocio = "";
      const p = this.master.personas.find(x => x.id === r.personaId);
      r.cuentaId = p?.cuentaId || "";
    } else if (layout === 'unidad') {
      // Al ir a unidad: limpia persona, y deja cuenta libre (filtrada por unidad)
      r.personaId = "";
      // si ya hay unidad, dejamos cuenta seleccionada si pertenece; si no, vacía
      const cuentas = this.master.cuentas.filter(c => c.unidad === r.unidadNegocio);
      if (!cuentas.find(c => c.id === r.cuentaId)) r.cuentaId = "";
    }
  }
},

// Cuando cambia persona en una fila
  onChangePersona(row) {
    // Bloquea modo persona y setea la cuenta si coincide con la moneda actual
    this.enforceLayout('persona');
    const p = this.master.personas.find(x => x.id === row.personaId);
    const c = p ? this.master.cuentas.find(x => x.id === p.cuentaId && x.moneda === (this.curr?.moneda || '')) : null;
    row.cuentaId = c ? c.id : "";
  },

// Cuando cambia unidad en una fila
onChangeUnidad(row) {
  if (row.unidadNegocio) {
    // bloquea en 'unidad'
    this.enforceLayout('unidad');
    // limpia cuenta si no pertenece a la unidad
    const cuentas = this.master.cuentas.filter(c => c.unidad === row.unidadNegocio);
    if (!cuentas.find(c => c.id === row.cuentaId)) row.cuentaId = "";
  } else {
    // si deselecciona y no hay ninguna unidad en ninguna fila, libera el modo
    this.tryUnlockLayoutIfEmpty();
  }
},

// Intenta liberar el modo si no hay selección en ninguna fila
tryUnlockLayoutIfEmpty() {
  const list = this.curr?.detalle || [];
  const anyPersona = list.some(r => !!r.personaId);
  const anyUnidad  = list.some(r => !!r.unidadNegocio);
  if (!anyPersona && !anyUnidad) this.lockedLayout = null;
},

// Botón "Cambiar modo"
resetLayout() {
  this.lockedLayout = null;
  const list = this.curr?.detalle || [];
  for (const r of list) {
    // dejamos ambas columnas vacías y cuenta vacía
    r.personaId = "";
    r.unidadNegocio = "";
    r.cuentaId = "";
  }
},

async confirmDeleteType(idx, typeName) {
  const { value: confirmed } = await Swal.fire({
    title: '¿Eliminar tipo de transacción?',
    text: `Se eliminará "${typeName}" y todas sus instrucciones asociadas.`,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    customClass: {
      popup: 'rounded-xl',
      confirmButton: 'tw-btn-danger',
      cancelButton: 'tw-btn',
      actions: 'flex gap-3 justify-center'
    }
  }).then(res => ({ value: res.isConfirmed }));

  if (!confirmed) return;

  // Eliminamos el tipo y sus instrucciones asociadas
  const typeToRemove = this.state.typesAdded[idx];
  this.state.typesAdded.splice(idx, 1);
  delete this.state.instructionsByType[typeToRemove];

  // Ajusta el tab activo si hace falta
  if (this.ui.activeTab >= this.state.typesAdded.length) {
    this.ui.activeTab = Math.max(0, this.state.typesAdded.length - 1);
  }

  this.toastSuccess(`"${typeName}" fue eliminado correctamente.`);

  /*await Swal.fire({
    title: 'Eliminado',
    text: `"${typeName}" fue eliminado correctamente.`,
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
    customClass: { popup: 'rounded-xl' }
  });*/
},


async confirmDeleteInstruction(index) {
  if (index == null || !this.curr) return;

  const { value: confirmed } = await Swal.fire({
    title: '¿Eliminar esta instrucción?',
    text: 'Esta acción no se puede deshacer.',
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    customClass: {
      popup: 'rounded-xl',
      confirmButton: 'tw-btn-danger',
      cancelButton: 'tw-btn',
          actions: 'flex gap-3 justify-center' // 👈 agrega espacio entre los botones
    },
    buttonsStyling: false
  }).then(res => ({ value: res.isConfirmed }));

  if (!confirmed) return;

  this.eliminarInstruccion(index);

    this.toastSuccess(`La instrucción se eliminó correctamente.`);

    /*
  await Swal.fire({
    title: 'Eliminada',
    text: 'La instrucción se eliminó correctamente.',
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
    customClass: { popup: 'rounded-xl' }
  });*/
},

async confirmDeleteRow(idx) {
  const { value: ok } = await Swal.fire({
    title: '¿Eliminar fila?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar',
    reverseButtons: true,
    customClass: { confirmButton: 'tw-btn-danger', cancelButton: 'tw-btn' },
    buttonsStyling: false
  }).then(r => ({ value: r.isConfirmed }));

  if (!ok) return;
  this.eliminarFila(idx);
},

    // Agregar documento adicional manualmente
    agregarDoc() {
      const name = (this.ui.newDocName || "").trim();
      if (!name) return;
      const currentType = this.state.typesAdded[this.ui.activeTab];
      const currentInstruction = this.state.instructionsByType[currentType][this.ui.activeInstructionTab];
      currentInstruction.docs.push({ id: this.uid(), nombre: name });
      this.ui.newDocName = "";
    },
isFileAllowed(file) {
  if (!file) return false;

  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
  ];

  const allowedExts = ['pdf', 'xls', 'xlsx'];
  const ext = file.name.split('.').pop().toLowerCase();

  return allowedMimeTypes.includes(file.type) || allowedExts.includes(ext);
},

// ==== Helpers ====
currentIns() { return this.curr; }, // alias corto


// ==== Upload INICIALES (a nivel instrucción) ====
onFileInicial(ev, doc) {
  const ins = this.currentIns();
  if (!ins) return;

  const f = ev.target.files?.[0];
  if (!f) return;

  if (!this.isPdf(f)) {
    this.toastError('Solo se permite PDF');
    ev.target.value = '';
    return;
  }

  doc.file = f;          // el doc pertenece a ESTA instrucción
  doc.fileName = f.name;
},

// ==== Upload DINÁMICOS (a nivel instrucción) ====
onFileExtra(ev, d) {
  const ins = this.currentIns();
  if (!ins) return;

  const f = ev.target.files?.[0];
  if (!f) return;

  if (!this.isFileAllowed(f)) {
    this.toastError('Solo se permiten archivos PDF o Excel');
    ev.target.value = '';
    return;
  }

  d.file = f;
  d.fileName = f.name;
},


addDynamicDoc() {
   const name = (this.ui.newDocName || '').trim();
  if (!name) { this.toastInfo('Escriba el nombre del documento'); return; }



  this.master.globalDocsExtras.push({
    id: this.uid(),
    label: this.ui.newDocName.trim(),
    file: null,
    fileName: "",
  });
  this.ui.newDocName = "";
   this.toastSuccess('Nuebo documento registrado'); return;
},

onFileGlobal(e, doc) {
  const file = e.target.files[0];
  if (!file) return;
  doc.file = file;
  doc.fileName = file.name;
},

confirmDeleteGlobalDoc(i) {
  const removed = this.master.globalDocsExtras[i];
  this.master.globalDocsExtras.splice(i, 1);
  if (!removed) return;

  for (const t of this.state.typesAdded || []) {
    const list = this.state.instructionsByType[t] || [];
    for (const ins of list) {
      if (!Array.isArray(ins.docsGlobalSeleccionados)) continue;
      ins.docsGlobalSeleccionados = ins.docsGlobalSeleccionados.filter(d => d.id !== removed.id);
    }
  }
},

toggleDocSeleccionado(docId) {
  const ins = this.currentIns();
  if (!ins) return;

  if (!Array.isArray(ins.docsGlobalSeleccionados)) {   // ← asegura el array
    ins.docsGlobalSeleccionados = [];
  }

  const idx = ins.docsGlobalSeleccionados.findIndex(d => d.id === docId);
  if (idx >= 0) {
    ins.docsGlobalSeleccionados.splice(idx, 1);
    return;
  }

  const base = this.master.globalDocsExtras.find(d => d.id === docId);
  if (!base) return;

  ins.docsGlobalSeleccionados.push({
    id: base.id,
    label: base.label,
    fileName: base.fileName || '',
    file: base.file || null,
    tipo: 'global',
    insId: ins.id
  });
}
,

confirmDeleteGlobalDoc(i) {
  const removed = this.master.globalDocsExtras[i];
  this.master.globalDocsExtras.splice(i, 1);

  if (!removed) return;
  // limpiar de cada instrucción donde estuviera seleccionado
  for (const t of this.state.typesAdded || []) {
    const list = this.state.instructionsByType[t] || [];
    for (const ins of list) {
      if (!Array.isArray(ins.docsGlobalSeleccionados)) continue;
      ins.docsGlobalSeleccionados = ins.docsGlobalSeleccionados.filter(d => d.id !== removed.id);
    }
  }
},

async confirmDeleteDynamicDoc(di) {
  const ins = this.currentIns();
  if (!ins) return;
  const d = ins.docsExtras[di];
  if (!d) return;

  const { isConfirmed } = await Swal.fire({
    title: '¿Quitar documento?',
    text: `Se quitará "${d.label}".`,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonText: 'Sí, quitar',
    cancelButtonText: 'Cancelar',
    buttonsStyling: false,
    customClass: {
      confirmButton: 'tw-btn-danger',
      cancelButton: 'tw-btn',
      actions: 'flex gap-3 justify-center',
      popup: 'rounded-xl'
    }
  });

  if (!isConfirmed) return;

  ins.docsExtras.splice(di, 1);
  this.toastSuccess('Documento eliminado');
},


// (Opcional) limpiar archivo de un doc inicial
clearDocFile(doc) {
  doc.file = null;
  doc.fileName = '';
},
// (Opcional) recolectar docs de UNA instrucción (para enviar al backend)
collectDocsOf(ins) {
  const base = ins.docsIniciales.map(d => ({
    key: d.key, label: d.label, fileName: d.fileName, file: d.file, tipo: 'inicial', insId: ins.id
  }));
  const extra = ins.docsExtras.map(d => ({
    id: d.id, label: d.label, fileName: d.fileName, file: d.file, tipo: 'extra', insId: ins.id
  }));
  const globalSel = (ins.docsGlobalSeleccionados || []).map(d => ({
    id: d.id, label: d.label, fileName: d.fileName, file: d.file, tipo: 'global', insId: ins.id
  }));
  return [...base, ...extra, ...globalSel];
},

// (Opcional) recolectar docs de TODAS las instrucciones del tipo activo
collectAllDocsOfActiveType() {
  const type = this.state.typesAdded[this.ui.activeTab];
  const list = this.state.instructionsByType[type] || [];
  return list.flatMap(ins => this.collectDocsOf(ins));
},
// --- (Opcional) recolectar todos los adjuntos para enviar al backend ---
collectAllDocs() {
  // Retorna un arreglo unificado con metadatos y File
  const base = this.initialDocs.map(d => ({
    key: d.key,
    label: d.label,
    fileName: d.fileName,
    file: d.file,
    tipo: 'inicial'
  }));
  const extra = this.extraDocs.map(d => ({
    id: d.id,
    label: d.label,
    fileName: d.fileName,
    file: d.file,
    tipo: 'extra'
  }));
  return [...base, ...extra];
},
  onUnidadCabeceraChange() {
    if (!this.curr) return;
    this.curr.cuentaCabeceraId = ""; // limpia cuenta
  },
onMonedaChange() {
  if (!this.curr) return;

  // Limpiar cabecera
  this.curr.cuentaCabeceraId = "";

  // Actualizar cada fila
  const list = this.curr.detalle || [];

  // Si la moneda cambia, y alguna persona no coincide con la nueva, vaciarla
  for (const r of list) {
    const p = this.master.personas.find(x => x.id === r.personaId);
    if (p && p.moneda !== this.curr.moneda) {
      r.personaId = "";
      r.cuentaId = "";
    }
  }

  // Recalcular las cuentas también
  if (this.lockedLayout === 'persona') {
    for (const r of list) {
      if (!r.personaId) continue;
      const p = this.master.personas.find(x => x.id === r.personaId);
      const c = this.master.cuentas.find(
        x => x.id === p?.cuentaId && x.moneda === this.curr.moneda
      );
      r.cuentaId = c ? c.id : "";
    }
  } else {
    for (const r of list) {
      if (!r.unidadNegocio) continue;
      const ok = this.master.cuentas.some(
        c => c.id === r.cuentaId && c.unidad === r.unidadNegocio && c.moneda === this.curr.moneda
      );
      if (!ok) r.cuentaId = "";
    }
  }

  

  
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

// -------- helpers básicos --------
normalizeBankName(b) {
  const map = {
    'BANCO DE CRÉDITO': 'BCP',
    'SCOTIABANK PERÚ': 'SCOTIABANK',
    'BBVA PERÚ': 'BBVA',
    'BANCO DE LA NACIÓN': 'BANCO DE LA NACIÓN',
    'INTERBANK': 'INTERBANK',
    'BCP': 'BCP', 'BBVA': 'BBVA', 'SCOTIABANK': 'SCOTIABANK'
  };
  return map[b?.trim()] || (b || '').trim();
},

// -------- índice de tipos --------
// -------- índice de tipos --------
async loadTiposTransaccion() {
  try {
    const res = await fetch('json/tipos-transaccion.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('No se pudo cargar tipos-transaccion.json');

    const tiposRaw = await res.json();
    this.tiposTransferencia = Array.isArray(tiposRaw) ? tiposRaw : [];

    // --- Normaliza cada item del JSON ---
    const tipos = (Array.isArray(tiposRaw) ? tiposRaw : []).map(t => {
      const desc = (t.descripcion || '').trim();
      const cat  = (t.categoria || '').trim();
      const idp  = (t.idPersona == null || t.idPersona === '') ? null : String(t.idPersona).trim();

      // Normaliza booleans: true/false o "true"/"false" o valores truthy/falsy
      let tienePersona = false;
      if (typeof t.tienePersona === 'boolean') {
        tienePersona = t.tienePersona;
      } else if (typeof t.tienePersona === 'string') {
        tienePersona = t.tienePersona.trim().toLowerCase() === 'true';
      } else {
        // si viene 1/0, "1"/"0", etc.
        tienePersona = !!t.tienePersona;
      }

      return {
        codigo: (t.codigo || '').trim(),
        descripcion: desc,
        categoria: cat,
        tienePersona,
        idPersona: idp
      };
    }).filter(t => t.descripcion); // desc obligatoria

    // Índices
    this.state.tiposByCode = {};
    this.state.tiposByDesc = {};
    for (const t of tipos) {
      this.state.tiposByCode[t.codigo] = t;
      this.state.tiposByDesc[t.descripcion.toLowerCase()] = t;
    }

    // Lista para el <select> (únicos, en orden)
    const uniq = [];
    const seen = new Set();
    for (const t of tipos) {
      const d = t.descripcion.toLowerCase();
      if (!seen.has(d)) {
        uniq.push(t.descripcion);
        seen.add(d);
      }
    }
    this.master.types = uniq;

    // Arrays de layout (persona/unidad) con normalización de booleano
    const personaTypes = [];
    const unidadTypes  = [];
    for (const t of tipos) {
      if (t.tienePersona) personaTypes.push(t.descripcion);
      else unidadTypes.push(t.descripcion);
    }
    this.personaTypes = [...new Set(personaTypes)];
    this.unidadTypes  = [...new Set(unidadTypes)];

    // (Debug útil)
    console.log('Total tipos:', tipos.length);
    console.log('Tipos con persona:', this.personaTypes.length);
    console.table(this.personaTypes.slice(0, 10));
    console.log('Tipos por unidad:', this.unidadTypes.length);
    console.table(this.unidadTypes.slice(0, 10));

    // Limpia selección si quedó inválida
    if (this.ui.selectedType && !seen.has(this.ui.selectedType.toLowerCase())) {
      this.ui.selectedType = '';
    }

    this.toastSuccess('Tipos de transacción cargados');
  } catch (e) {
    console.error(e);
    this.toastError('No se pudo cargar tipos de transacción');
  }
},



// -------- resolutores de cuenta --------
// Persona: devuelve cuentaId (match por id exacto y moneda)
// Unidad: escoge primera cuenta por unidad + moneda respetando orden de bancos


// -------- util para asegurar que siempre haya 1 fila mínimo --------
ensureOneRow() {
  if (!this.curr) return;
  if (!Array.isArray(this.curr.detalle)) this.curr.detalle = [];
  if (this.curr.detalle.length === 0) {
    this.curr.detalle.push({
      uid: this.uid(),
      personaId: "",
      unidadNegocio: "",
      cuentaId: "",
      monto: "",
      aprob: false
    });
  }
},
slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
},

// Construye master desde JSON v3
buildMasterFromV3(v3) {
  const unidades = Object.keys(v3.unidades || {});
  const bankSet = new Set();
  const cuentas = [];

  for (const unidad of unidades) {
    const porBanco = v3.unidades[unidad] || {};
    for (const bancoRaw of Object.keys(porBanco)) {
      const banco = this.normalizeBankName(bancoRaw);
      bankSet.add(banco);

      const items = porBanco[bancoRaw] || [];
      items.forEach((it, i) => {
        const numero = String(it.numero || '').replace(/^N°\s*/i,'').trim();
        if (!numero) return;
        const moneda = (it.moneda || 'PEN').toUpperCase();
        const id = `cta-${this.slugify(banco)}-${this.slugify(unidad)}-${moneda.toLowerCase()}-${i+1}`;

        cuentas.push({
          id,
          alias: `${banco} ${moneda}`,
          numero,
          unidad,
          moneda,
          banco
        });
      });
    }
  }

  return {
    unidades,
    bancos: Array.from(bankSet),
    cuentas
  };
},

// Encuentra la mejor cuenta para una persona (una sola) por moneda
pickAccountForPersona({ cuentas, bancoPreferido, unidadPreferida, moneda }) {
  // 1) banco + unidad + moneda
  let c = cuentas.find(x =>
    x.banco === bancoPreferido && x.unidad === unidadPreferida && x.moneda === moneda
  );
  if (c) return c.id;

  // 2) banco + moneda (cualquier unidad)
  c = cuentas.find(x => x.banco === bancoPreferido && x.moneda === moneda);
  if (c) return c.id;

  // 3) cualquier cuenta por moneda
  c = cuentas.find(x => x.moneda === moneda);
  if (c) return c.id;

  return ''; // no encontrada
},

// Crea (si hace falta) una cuenta placeholder para la persona
ensurePlaceholderAccount({ cuentas, bancoPreferido, unidadPreferida, moneda }) {
  const id = `cta-${this.slugify(bancoPreferido)}-${this.slugify(unidadPreferida)}-${moneda.toLowerCase()}-placeholder`;
  if (!cuentas.some(c => c.id === id)) {
    cuentas.push({
      id,
      alias: `${bancoPreferido} ${unidadPreferida} ${moneda}`,
      numero: '—',
      unidad: unidadPreferida,
      moneda,
      banco: bancoPreferido
    });
  }
  return id;
},

// Carga el JSON v3 y reemplaza master.*; asigna cuentaId a cada persona (una sola)
async loadMacroCuentasAndReplace() {
  try {
    const res = await fetch('json/macro-cuentas.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('No se pudo cargar macro-cuentas.v3.json');
    const v3 = await res.json();

    // 1) Construir master desde JSON
    const built = this.buildMasterFromV3(v3);

    // 2) Reemplazar master.* (unidades, bancos, cuentas)
    this.master.unidades = built.unidades;
    this.master.bancos   = built.bancos;
    this.master.cuentas  = built.cuentas;

    // 3) Monedas por defecto si hiciera falta
    if (!Array.isArray(this.master.monedas) || this.master.monedas.length === 0) {
      this.master.monedas = ['PEN', 'USD'];
    }

    // 4) Asegurar personas base si no existen
    if (!Array.isArray(this.master.personas) || this.master.personas.length === 0) {
      this.master.personas = Object.keys(v3.personasCatalog || {}).map(pid => ({
        id: pid,
        nombre: v3.personasCatalog[pid].nombre,
        moneda: /usd/i.test(pid) ? 'USD' : 'PEN',
        cuentaId: ''
      }));
    }

    // 5) Asignar UNA cuenta por persona, según moneda y preferencias
    this.master.personas = this.master.personas.map(p => {


      const pref = (v3.personasCatalog && v3.personasCatalog[p.id]) || {};
      const bancoPref = this.normalizeBankName(pref.bancoPreferido || 'BBVA');
      const unidadPref = pref.unidadPreferida || (this.master.unidades.find(u => u.toUpperCase().includes('MACROFONDO')) || this.master.unidades[0]);
      const moneda = (p.moneda || 'PEN').toUpperCase();

      let cuentaId = this.pickAccountForPersona({
        cuentas: this.master.cuentas,
        bancoPreferido: bancoPref,
        unidadPreferida: unidadPref,
        moneda
      });

      if (!cuentaId) {
        // crea placeholder si no existe ninguna cuenta apta
        cuentaId = this.ensurePlaceholderAccount({
          cuentas: this.master.cuentas,
          bancoPreferido: bancoPref,
          unidadPreferida: unidadPref,
          moneda
        });
      }

      return { ...p, cuentaId };
    });

          console.log("1")
          console.log(this.master.personas)

    this.toastSuccess('Catálogo bancario actualizado y personas asignadas');
  } catch (e) {
    console.error(e);
    this.toastError('No se pudo actualizar data desde JSON externo');
  }
},
// ====== PÉGALO DENTRO DE methods: { ... } ======

isPersonaType(desc) {
  if (!desc) return false;
  const meta = this.state?.tiposByDesc?.[String(desc).trim().toLowerCase()];
  return !!meta?.tienePersona;
},
getTipoMeta(desc) {
  if (!desc) return null;
  return this.state?.tiposByDesc?.[String(desc).trim().toLowerCase()] || null;
},

// Si ya tienes uno similar, deja el tuyo y borra este
resolveCuentaForPersona(personaId, moneda) {
  const p = this.master.personas.find(x => x.id === personaId);
  if (!p) return '';
  // Si la moneda no coincide, intenta el "gemelo" por nombre
  if ((p.moneda || 'PEN').toUpperCase() !== (moneda || 'PEN').toUpperCase()) {
    const alt = this.master.personas.find(
      x => x.nombre === p.nombre && (x.moneda || 'PEN').toUpperCase() === (moneda || 'PEN').toUpperCase()
    );
    return alt?.cuentaId || '';
  }
  return p.cuentaId || '';
},

// Si ya tienes resolveCuentaForUnidad, usa el tuyo:
resolveCuentaForUnidad(unidad, moneda, preferBankOrder = ['BBVA','BCP','INTERBANK','SCOTIABANK','BANCO DE LA NACIÓN']) {
  const pool = this.master.cuentas.filter(c => c.unidad === unidad && c.moneda === moneda);
  if (pool.length === 0) return '';
  const bankIndex = (alias) => {
    const upper = (alias || '').toUpperCase();
    const idx = preferBankOrder.findIndex(b => upper.startsWith(b));
    return idx === -1 ? 999 : idx;
  };
  const sorted = pool.slice().sort((a,b) => bankIndex(a.alias) - bankIndex(b.alias));
  return sorted[0]?.id || pool[0].id;
},

// 👇👇 EL MÉTODO QUE TE FALTA
applyTipoRulesForCurrent() {
  const tDesc = this.state.typesAdded?.[this.ui.activeTab];
  const ins = this.curr;
  if (!tDesc || !ins) return;

  const meta = this.getTipoMeta(tDesc);
  const moneda = (ins.moneda || 'PEN').toUpperCase();

  this.curr.unidad = this.ui.selectedUN;

  if (meta?.tienePersona) {
    // Forzar layout persona
    this.enforceLayout?.('persona');

    // Asegura al menos una fila
    if (!Array.isArray(ins.detalle) || ins.detalle.length === 0) {
      ins.detalle = [{
        uid: this.uid(),
        personaId: "",
        unidadNegocio: "",
        cuentaId: "",
        monto: "",
        aprob: false
      }];
    }

    // Setear persona/cuenta si el tipo trae idPersona
    ins.detalle.forEach(row => {
      if (meta.idPersona && !row.personaId) row.personaId = meta.idPersona;

      if (row.personaId) {
        row.cuentaId = this.resolveCuentaForPersona(row.personaId, moneda) || '';
        console.log(row.cuentaId)
      }
      // En modo persona, limpia unidad
      row.unidadNegocio = '';
    });

    // Cabecera (opcional): toma la cuenta de la primera fila
    if (!ins.cuentaCabeceraId && ins.detalle[0]?.cuentaId) {
      ins.cuentaCabeceraId = ins.detalle[0].cuentaId;
    }

  } else {
    // Forzar layout unidad (no hace nada extra si no quieres)
    this.enforceLayout?.('unidad');

    // Asegura al menos una fila
    if (!Array.isArray(ins.detalle) || ins.detalle.length === 0) {
      ins.detalle = [{
        uid: this.uid(),
        personaId: "",
        unidadNegocio: this.master.unidades[0] || "",
        cuentaId: "",
        monto: "",
        aprob: false
      }];
    }

    // Sugerir cuenta por unidad+moneda
    ins.detalle.forEach(row => {
      if (!row.unidadNegocio) row.unidadNegocio = this.master.unidades[0] || '';
      row.personaId = '';
      row.cuentaId = this.resolveCuentaForUnidad(row.unidadNegocio, moneda) || '';
    });

    // Cabecera (opcional): por unidad/moneda
    if (!ins.cuentaCabeceraId) {
      const uCab = ins.unidad || ins.detalle[0]?.unidadNegocio || this.master.unidades[0] || '';
      ins.cuentaCabeceraId = this.resolveCuentaForUnidad(uCab, moneda) || '';
    }
  }
},

// === 🔸 Guardar en localStorage sin sobreescribir ===
saveToLocalStorage(key = 'instruccionesData') {
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    const data = {
      master: this.master,
      state: this.state,
      ui: this.ui,
      timestamp: new Date().toISOString()
    };

    // fusiona sin sobreescribir propiedades existentes
    const merged = { ...existing, ...data };
    localStorage.setItem(key, JSON.stringify(merged));

    this.toastSuccess('Datos guardados en localStorage');
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
    this.toastError('No se pudo guardar');
  }
},

// === 🔸 Recuperar del localStorage (sin sobreescribir el actual) ===
loadFromLocalStorage(key = 'instruccionesData') {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '{}');
    if (!stored || Object.keys(stored).length === 0) {
      this.toastInfo('No hay datos previos guardados');
      return;
    }

    this.master = { ...this.master, ...(stored.master || {}) };
    this.state  = { ...this.state,  ...(stored.state  || {}) };
    this.ui     = { ...this.ui,     ...(stored.ui     || {}) };

    // 🔧 Normalización de instrucciones antiguas
    for (const t of this.state.typesAdded || []) {
      const list = this.state.instructionsByType?.[t] || [];
      for (const ins of list) {
        if (!Array.isArray(ins.docsGlobalSeleccionados)) {
          ins.docsGlobalSeleccionados = [];
        }
        if (!Array.isArray(ins.docsIniciales) || ins.docsIniciales.length === 0) {
          // repone los iniciales (incluye Documento Sustento)
          ins.docsIniciales = this.initialDocs.map(d => ({ ...d }));
        } else {
          // asegura shape de cada doc inicial
          ins.docsIniciales = ins.docsIniciales.map(d => ({
            key: d.key ?? 'sustentos',
            label: d.label ?? 'Documento Sustento',
            fileName: d.fileName ?? '',
            file: d.file ?? null
          }));
        }
        if (!Array.isArray(ins.docsExtras)) ins.docsExtras = [];
        if (!Array.isArray(ins.detalle)) ins.detalle = [];
      }
    }

    this.toastSuccess('Datos recuperados de localStorage');
  } catch (e) {
    console.error('Error al cargar desde localStorage:', e);
    this.toastError('No se pudo cargar');
  }
},



  



  },
  mounted() {
    this.$nextTick(() => {
      // Si usas Tom Select, tu <select> debe tener id="selectTipoTransaccion"
      new TomSelect('#selectTipoTransaccion', {
        create: true,
        placeholder: 'Escribe o selecciona un tipo...',
        sortField: { field: 'text', direction: 'asc' },
        onChange: (v) => { this.ui.selectedType = v; }
      });
    });
  },
  
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

// Monta
app.mount("#app");