const { createApp, computed } = Vue;

createApp({
  data() {
    return {
     master: {
        types: ["Transferencias", "Habilitación de recursos", "Pago de pensiones", "Devoluciones fcjmms"],
        unidades: ["Pública", "Privada", "Mixta"],
        bancos: ["SCOTIABANK", "BBVA", "BCP", "INTERBANK"],

        // Personas con cuenta definida (si eliges persona, la cuenta se setea sola)
        personas: [
          { id: "per-001", nombre: "Juan Pérez",   cuentaId: "cta-bbva-001" },
          { id: "per-002", nombre: "ACME S.A.C.",  cuentaId: "cta-bcp-010" },
          { id: "per-003", nombre: "María López",  cuentaId: "cta-ibk-021" }
        ],

        // Cuentas bancarias parametrizadas por unidad (y banco de referencia si quieres mostrar)
        cuentas: [
          { id: "cta-bbva-001", alias: "Planilla Central", numero: "BBVA-001-123456", unidad: "Pública",  banco: "BBVA" },
          { id: "cta-bbva-002", alias: "Operaciones",      numero: "BBVA-002-654321", unidad: "Pública",  banco: "BBVA" },
          { id: "cta-bcp-010",  alias: "Servicios",        numero: "BCP-010-777777",  unidad: "Privada",  banco: "BCP"  },
          { id: "cta-ibk-021",  alias: "Impuestos",        numero: "IBK-021-111111",  unidad: "Mixta",    banco: "INTERBANK" }
        ]
      },
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

currentType() {
  return this.state.typesAdded[this.ui.activeTab];
},
isPersonaLayout() {
  return this.personaTypes.includes(this.currentType);
},
cuentasPara() {
  return (row) => {
    if (this.lockedLayout === 'persona') {
      const p = this.master.personas.find(x => x.id === row.personaId);
      if (!p) return [];
      const c = this.master.cuentas.find(x => x.id === p.cuentaId);
      return c ? [c] : [];
    }
    // 'unidad' o null (antes de bloquear): filtra por unidad si existe
    if (!row.unidadNegocio) return [];
    return this.master.cuentas.filter(c => c.unidad === row.unidadNegocio);
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


    
  },

  methods: {
    // Genera un ID único
    uid() { return Math.random().toString(36).slice(2); },

    // Agrega un tipo de transacción
    addType() {
      const t = this.ui.selectedType;
      if (!t) return;
      if (!this.state.typesAdded.includes(t)) {
        this.state.typesAdded.push(t);
        this.state.instructionsByType[t] = []; // Inicializa el grupo de instrucciones para este tipo
        this.addInstruction(t); // Agrega la primera instrucción automáticamente
      }
      this.ui.selectedType = "";
    },

    // Agrega una instrucción dentro del tipo de transacción
    addInstruction(type) {
      if (!this.state.instructionsByType[type]) {
        this.state.instructionsByType[type] = [];
      }
      const newInstruction = this.newInstruction();
      this.state.instructionsByType[type].push(newInstruction);
      this.ui.activeInstructionTab = this.state.instructionsByType[type].length - 1; // Establece la instrucción recién agregada como activa
    },

    // Crea una nueva instrucción
    newInstruction() {
  return {
    id: this.uid(),
    descripcion: "",
    producto: "",
    unidad: "Pública",
    fecha: new Date().toISOString().slice(0, 10),
    moneda: "PEN",
    importe: "",
    banco: "SCOTIABANK",
    nroCuenta: "",
    aprobado: false,   // <-- nivel instrucción
    detalle: [],       // <-- filas (cada una con r.aprob)
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

  ins.detalle.push({
    uid: this.uid(),
    personaId: "",
    unidadNegocio: "",
    cuentaId: "",
    monto: "",
    aprob: false       // <-- nivel fila
  });
},




    // Duplicar una fila en la tabla de detalles de una instrucción
duplicarFila(idx) {
  const ins = this.curr;
  const src = ins.detalle[idx];
  ins.detalle.splice(idx + 1, 0, { ...src, uid: this.uid() });
},
eliminarFila(idx) {
  const ins = this.curr;
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

    onChangePersona(row) {
  // Cuando cambia la persona, setea automáticamente la cuenta y bloquea el select de cuenta
  const p = this.master.personas.find(x => x.id === row.personaId);
  row.cuentaId = p?.cuentaId || "";
},

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
  if (row.personaId) {
    // bloquea en 'persona'
    this.enforceLayout('persona');
    // setea cuenta por la persona
    const p = this.master.personas.find(x => x.id === row.personaId);
    row.cuentaId = p?.cuentaId || "";
  } else {
    // si deselecciona y no hay ninguna persona en ninguna fila, libera el modo
    this.tryUnlockLayoutIfEmpty();
  }
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

  await Swal.fire({
    title: 'Eliminado',
    text: `"${typeName}" fue eliminado correctamente.`,
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
    customClass: { popup: 'rounded-xl' }
  });
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

  await Swal.fire({
    title: 'Eliminada',
    text: 'La instrucción se eliminó correctamente.',
    icon: 'success',
    timer: 1500,
    showConfirmButton: false,
    customClass: { popup: 'rounded-xl' }
  });
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
}

  }
}).mount("#app");
