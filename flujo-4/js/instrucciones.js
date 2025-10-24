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
     master: {
        types: ["Transferencias", "Habilitación de recursos", "Pago de pensiones", "Devoluciones fcjmms"],
        unidades: ["FCR-Macrofondo", "FCR-Emsal", "FCR-Paramonga"],
        bancos: ["SCOTIABANK", "BBVA", "BCP", "INTERBANK"],
         monedas: ["PEN", "USD"],


        // Personas con cuenta definida (si eliges persona, la cuenta se setea sola)
        personas: [
    // PEN
    { id: "per-001", nombre: "Juan Pérez",   cuentaId: "cta-bbva-pen",  moneda: "PEN" },
    { id: "per-002", nombre: "ACME S.A.C.",  cuentaId: "cta-bcp-pen",   moneda: "PEN" },
    { id: "per-003", nombre: "María López",  cuentaId: "cta-ibk-pen",   moneda: "PEN" },

    // USD
    { id: "usd-001", nombre: "Juan Pérez",   cuentaId: "cta-bbva-usd",  moneda: "USD" },
    { id: "usd-002", nombre: "ACME S.A.C.",  cuentaId: "cta-bcp-usd",   moneda: "USD" },
    { id: "usd-003", nombre: "María López",  cuentaId: "cta-ibk-usd",   moneda: "USD" },
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
      },
      

            singleRowTypes: [
      "Transferencias",
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
      
    };
  },

    created() {
    // 1) Preselecciona un tipo por defecto
    this.ui.selectedType = this.master.types[0] || "";

    // 2) Asegura que exista al menos un tipo agregado
    if (this.ui.selectedType) {
      this.addType();                 // agrega el seleccionado y limpia selectedType
      this.ui.activeTab = 0;          // apunta al primer tab
    }

    // 3) Asegura al menos una instrucción en el tipo activo
    const currentType = this.state.typesAdded[this.ui.activeTab];
    if (currentType) {
      if (!Array.isArray(this.state.instructionsByType[currentType])) {
        this.state.instructionsByType[currentType] = [];
      }
      if (this.state.instructionsByType[currentType].length === 0) {
        this.addInstruction(currentType);     // crea la primera instrucción
      }
      this.ui.activeInstructionTab = 0;       // selecciona la primera instrucción
    }
  },

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

    
  },

  methods: {
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

  // Si el tipo solo permite una fila, asegúrate de crearla
  if (this.singleRowTypes.includes(type)) {
    if (!Array.isArray(ins.detalle) || ins.detalle.length === 0) {
      ins.detalle.push({
        uid: this.uid(),
        personaId: "",
        unidadNegocio: "",
        cuentaId: "",
        monto: "",
        aprob: false
      });
    }
  }
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
    detalle: [],
    docs: []
  };
},



    // Guarda las instrucciones (solo demo)
   guardarTodo() {
  const docs = this.collectAllDocs();

  // Ejemplo: validación mínima
  // if (!docs.every(d => d.file)) { ... }

  // Aquí armarías tu FormData para enviar al backend
  // const fd = new FormData();
  // docs.forEach((d, i) => d.file && fd.append(`file_${i}`, d.file, d.fileName));

  console.log('DOCS:', docs.map(d => ({
    label: d.label, file: !!d.file, fileName: d.fileName, tipo: d.tipo
  })));

  Swal.fire({
    icon: 'success',
    title: 'Guardado',
    text: 'Datos listos para enviar.',
    timer: 1200,
    showConfirmButton: false
  });
},

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
    // Toast de aviso (usa el mixin Toast que ya tienes)
    Toast.fire({ icon: 'warning', title: 'Este tipo solo permite una fila' });
    return;
  }

  ins.detalle.push({
    uid: this.uid(),
    personaId: "",
    unidadNegocio: "",
    cuentaId: "",
    monto: "",
    aprob: false
  });
},





    // Duplicar una fila en la tabla de detalles de una instrucción
duplicarFila(idx) {
  if (this.isSingleRowType) {
    Toast.fire({ icon: 'warning', title: 'No se puede duplicar en este tipo' });
    return;
  }
  const ins = this.curr;
  const src = ins.detalle[idx];
  ins.detalle.splice(idx + 1, 0, { ...src, uid: this.uid() });
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
    // --- UTIL ---
uid() { return Math.random().toString(36).slice(2); }, // si ya lo tienes, omite este

isPdf(file) {
  // Valida por MIME o por extensión
  return file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name));
},
formatBytes(n) {
  if (!n && n !== 0) return '';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(n) / Math.log(k));
  return (n / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
},

// --- UPLOAD INICIALES ---
onFileInicial(ev, doc) {
  const f = ev.target.files?.[0];
  if (!f) return;

  if (!this.isPdf(f)) {
    Swal.fire({
      icon: 'error',
      title: 'Archivo no válido',
      text: 'Solo se permite PDF.',
      timer: 1600, showConfirmButton: false
    });
    ev.target.value = '';
    return;
  }

  doc.file = f;
  doc.fileName = f.name;
},

// --- UPLOAD DINÁMICOS ---
onFileExtra(ev, d) {
  const f = ev.target.files?.[0];
  if (!f) return;

  if (!this.isPdf(f)) {
    Swal.fire({
      icon: 'error',
      title: 'Archivo no válido',
      text: 'Solo se permite PDF.',
      timer: 1600, showConfirmButton: false
    });
    ev.target.value = '';
    return;
  }

  d.file = f;
  d.fileName = f.name;
},

// --- AGREGAR DINÁMICO ---
addDynamicDoc() {
  const name = (this.ui.newDocName || '').trim();
  if (!name) {
    Swal.fire({ icon: 'info', title: 'Escribe un nombre', timer: 1200, showConfirmButton: false });
    return;
  }

  this.extraDocs.push({
    id: this.uid(),
    label: name,
    fileName: '',
    file: null
  });
  this.ui.newDocName = '';
},

// --- QUITAR DINÁMICO (con confirm bonito) ---
async confirmDeleteDynamicDoc(index) {
  const d = this.extraDocs[index];
  if (!d) return;

  const { value: ok } = await Swal.fire({
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
  }).then(r => ({ value: r.isConfirmed }));

  if (!ok) return;

  this.extraDocs.splice(index, 1);

  Swal.fire({
    icon: 'success',
    title: 'Documento quitado',
    timer: 1100,
    showConfirmButton: false,
    customClass: { popup: 'rounded-xl' }
  });
},

// --- (Opcional) limpiar archivo de una tarjeta ---
clearDocFile(doc) {
  doc.file = null;
  doc.fileName = '';
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



  }
});


// Registra la directiva global
app.directive('money', MoneyDirective);

// Monta
app.mount("#app");