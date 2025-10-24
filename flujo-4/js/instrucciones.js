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
      personaTypes: ["Habilitación de recursos"],
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
  // devolveremos una función para usar con la fila `r`
  return (row) => {
    if (this.isPersonaLayout) {
      const p = this.master.personas.find(x => x.id === row.personaId);
      if (!p) return [];
      const c = this.master.cuentas.find(x => x.id === p.cuentaId);
      return c ? [c] : [];
    } else {
      if (!row.unidadNegocio) return [];
      return this.master.cuentas.filter(c => c.unidad === row.unidadNegocio);
    }
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
    }

    
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
        aprobado: false,
        detalle: [], // Detalles bancarios vacíos inicialmente
        docs: []
      };
    },

    // Guarda las instrucciones (solo demo)
    guardarTodo() {
      console.clear();
      console.log("TYPES:", this.state.typesAdded);
      console.log("INSTRUCCIONES POR TIPO:", JSON.parse(JSON.stringify(this.state.instructionsByType)));
      alert("Guardado (demo). Revisa la consola del navegador.");
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
  const instruction = this.curr;
  if (!instruction) return;
  if (!Array.isArray(instruction.detalle)) instruction.detalle = [];

  instruction.detalle.push({
    uid: this.uid(),
    personaId: "",       // usado cuando isPersonaLayout === true
    unidadNegocio: "",   // usado cuando isPersonaLayout === false
    cuentaId: "",        // depende de persona o de unidad
    monto: "",
    aprob: false
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

onChangeUnidad(row) {
  // Cuando cambia la unidad, limpia cuenta y deja seleccionar entre las cuentas de esa unidad
  row.cuentaId = "";
},




    // Agregar documento adicional manualmente
    agregarDoc() {
      const name = (this.ui.newDocName || "").trim();
      if (!name) return;
      const currentType = this.state.typesAdded[this.ui.activeTab];
      const currentInstruction = this.state.instructionsByType[currentType][this.ui.activeInstructionTab];
      currentInstruction.docs.push({ id: this.uid(), nombre: name });
      this.ui.newDocName = "";
    }
  }
}).mount("#app");
