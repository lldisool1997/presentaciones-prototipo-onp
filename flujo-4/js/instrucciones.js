const { createApp, computed } = Vue;

createApp({
  data() {
    return {
      master: {
        types: [
          "Transferencias", "Pagos proveedores", "Planillas",
          "Impuestos", "Servicios", "Otros"
        ],
        unidades: ["Pública", "Privada", "Mixta"],
        bancos: ["SCOTIABANK", "BBVA", "BCP", "INTERBANK"]
      },
      ui: {
        selectedType: "",
        activeTab: 0, // Tab del tipo de transacción
        activeInstructionTab: null, // Instrucción activa seleccionada
        newDocName: ""
      },
      state: {
        typesAdded: [],
        instructionsByType: {} // Instrucciones agrupadas por tipo de transacción
      }
    };
  },

  computed: {
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
      if (!Array.isArray(instruction.detalle)) {
        instruction.detalle = [];
      }
      instruction.detalle.push({
        uid: this.uid(),
        banco: "",
        saldo: "",
        pension: "",
        cantidad: "",
        neto: "",
        aprob: false
      });
    },

    // Duplicar una fila en la tabla de detalles de una instrucción
    duplicarFila(idx) {
      const instruction = this.curr;
      const src = instruction.detalle[idx];
      instruction.detalle.splice(idx + 1, 0, { ...src, uid: this.uid() });
    },

    // Eliminar una fila en la tabla de detalles de una instrucción
    eliminarFila(idx) {
      const instruction = this.curr;
      instruction.detalle.splice(idx, 1);
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
