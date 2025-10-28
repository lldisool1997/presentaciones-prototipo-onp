const { createApp, computed } = Vue;

createApp({
  data(){
    return {
      selected: null,   // { tipo, id }
      dataAll: null,    // contenido de localStorage instruccionesData
      curr: null,       // instrucción encontrada
      master: {         // fallback si no existe en LS
        monedas: ['PEN','USD'],
        cuentas: [],
        personas: []
      },
      ui: {
        activeRowIdx: 0
      }
    };
  },

  created(){
    // 1) lee selección (puesta por lista-instrucciones)
    try {
      this.selected = JSON.parse(localStorage.getItem('selectedInstruction') || 'null');
    } catch (_) { this.selected = null; }

    // 2) carga dataset completo
    try {
      this.dataAll = JSON.parse(localStorage.getItem('instruccionesData') || '{}');
    } catch (_) { this.dataAll = {}; }

    // 3) master y búsqueda
    if (this.dataAll?.master) this.master = { ...this.master, ...this.dataAll.master };

    if (this.selected?.tipo && this.selected?.id) {
      const list = this.dataAll?.state?.instructionsByType?.[this.selected.tipo] || [];
      this.curr = list.find(i => i.id === this.selected.id) || null;
    }

    // Asegura índice válido si no hay detalle
    if (!this.curr?.detalle?.length) {
      this.ui.activeRowIdx = -1;
    }
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
    // En operaciones.js -> computed.docsOfInstruction (reemplaza la función)
docsOfInstruction(){
  const ins = this.curr;
  if (!ins) return [];
  const base  = Array.isArray(ins.docsIniciales) ? ins.docsIniciales : [];
  const extra = Array.isArray(ins.docsExtras)    ? ins.docsExtras    : [];
  const sueltos = Array.isArray(ins.docs)
    ? ins.docs.map(d => ({ key: 'adj', label: 'Sustento documentario', fileName: d.nombre, id: d.id }))
    : [];
  return [...base, ...extra, ...sueltos];
},

    activeRow(){
      const list = this.curr?.detalle || [];
      const i = this.ui.activeRowIdx;
      if (i == null || i < 0 || i >= list.length) return null;
      return list[i];
    }
  },

  methods: {
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

    // Acciones por detalle (solo lectura: muestra/lanza acción externa)
     generarCarta(row){
    // redirige a otra página o genera el documento según tu flujo real
    const url = `carta.html?id=${encodeURIComponent(this.selected?.id)}&cuenta=${encodeURIComponent(row?.cuentaId || '')}`;
    window.location.href = url;
  },
  generarComision(row){
    // la comisión se guarda dentro del row, puedes usarla luego si la persistes
    if (!row.comision) {
      alert('No se ingresó comisión (campo opcional).');
      return;
    }
    alert('Comisión ingresada: ' + this.money(row.comision));
  }
  }
}).mount('#app');
