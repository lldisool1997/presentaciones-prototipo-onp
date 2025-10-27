const { createApp, computed, watch } = Vue;

createApp({
  data(){
    return {
      master: {
        monedas: ['PEN','USD'],
        cuentas: [],
      },
      state: {
        typesAdded: [],
        instructionsByType: {}
      },
      // Filtros (agregamos rango de fechas)
      uiFilter: { tipo: '', moneda: '', q: '', fechaIni: '', fechaFin: '' },

      // Paginación global
      pagination: { page: 1, pageSize: 10 },
    };
  },

  computed:{
    // Lista global ya filtrada (aplica todos los criterios, incl. fechas)
    filteredAll(){
      const out = [];
      const { tipo, moneda, q, fechaIni, fechaFin } = this.uiFilter;
      const qLower = (q || '').toLowerCase();
      const from = fechaIni ? new Date(fechaIni) : null;
      const to   = fechaFin ? new Date(fechaFin) : null;

      for(const t of this.state.typesAdded){
        if (tipo && t !== tipo) continue;
        const list = this.state.instructionsByType?.[t] || [];
        for(const ins of list){
          // moneda
          if (moneda && (ins.moneda || '') !== moneda) continue;
          // texto
          if (qLower){
            const txt = (ins.descripcion || '').toLowerCase();
            if (!txt.includes(qLower)) continue;
          }
          // fecha (ins.fecha debe venir en YYYY-MM-DD o algo parseable)
          if (from || to){
            const d = ins.fecha ? new Date(ins.fecha) : null;
            if (!d) continue;
            if (from && d < from) continue;
            if (to   && d > to)   continue;
          }
          out.push({ tipo: t, ins });
        }
      }
      return out;
    },

    // Paginación calculada
    totalPages(){
      return Math.ceil(this.filteredAll.length / this.pagination.pageSize) || 0;
    },
    pageFrom(){
      if (this.filteredAll.length === 0) return 0;
      return (this.pagination.page - 1) * this.pagination.pageSize + 1;
    },
    pageTo(){
      const to = this.pagination.page * this.pagination.pageSize;
      return Math.min(to, this.filteredAll.length);
    },
    pagedAll(){
      const start = (this.pagination.page - 1) * this.pagination.pageSize;
      const end   = start + this.pagination.pageSize;
      return this.filteredAll.slice(start, end);
    },

    // Suma global de lo filtrado
    sumFiltered(){
      return this.filteredAll.reduce((acc, row) => acc + this.sumInstruction(row.ins), 0);
    }
  },

  methods:{
    // -------- LocalStorage (igual que tenías) --------
    loadFromLocalStorage(key = 'instruccionesData'){
      try{
        const stored = JSON.parse(localStorage.getItem(key) || '{}');
        if(!stored || Object.keys(stored).length === 0){
          this.toast('No hay datos previos en LocalStorage', 'info');
          return;
        }
        if(stored.master) this.master = { ...this.master, ...stored.master };
        if(stored.state)  this.state  = { ...this.state,  ...stored.state  };
        this.state.typesAdded = Array.isArray(this.state.typesAdded) ? this.state.typesAdded : [];
        this.state.instructionsByType = this.state.instructionsByType || {};
        this.toast('Datos cargados desde LocalStorage');
      }catch(e){
        console.error(e);
        this.toast('No se pudo cargar desde LocalStorage', 'error');
      }
    },
    clearLocal(key='instruccionesData'){
      localStorage.removeItem(key);
      this.toast('LocalStorage limpiado');
    },

    // -------- Demo --------
    seedDemo(){
      this.master.cuentas = [
        { id:'cta-bbva-pen', alias:'BBVA PEN', numero:'001-123456', unidad:'FCR-Macrofondo', moneda:'PEN', banco:'BBVA' },
        { id:'cta-bcp-pen',  alias:'BCP PEN',  numero:'002-111111', unidad:'FCR-Emsal',     moneda:'PEN', banco:'BCP'  },
        { id:'cta-ibk-usd',  alias:'INTERBANK USD', numero:'003-444444', unidad:'FCR-Paramonga', moneda:'USD', banco:'INTERBANK' },
      ];

      this.state.typesAdded = ['Transferencias', 'Habilitación de recursos'];

      const ins1 = {
        id: 'ins-001',
        descripcion: 'Pago proveedores semana 42',
        fecha: '2025-10-20',
        moneda: 'PEN',
        cuentaCabeceraId: 'cta-bbva-pen',
        aprobado: false,
        detalle: [
          { personaId:'', unidadNegocio:'FCR-Macrofondo', cuentaId:'cta-bbva-pen', monto:'25000', aprob:true },
          { personaId:'', unidadNegocio:'FCR-Emsal',      cuentaId:'cta-bcp-pen',  monto:'12000', aprob:false },
        ]
      };

      const ins2 = {
        id: 'ins-002',
        descripcion: 'Habilitación caja chica',
        fecha: '2025-10-24',
        moneda: 'USD',
        cuentaCabeceraId: 'cta-ibk-usd',
        aprobado: true,
        detalle: [
          { personaId:'', unidadNegocio:'FCR-Paramonga', cuentaId:'cta-ibk-usd', monto:'1500', aprob:true }
        ]
      };

      // Genera más para probar paginación
      const extra = Array.from({length: 27}).map((_,i)=>({
        id: 'ins-x' + (i+1),
        descripcion: 'Item auto ' + (i+1),
        fecha: i%2 ? '2025-10-19' : '2025-10-22',
        moneda: i%3 ? 'PEN':'USD',
        cuentaCabeceraId: i%2 ? 'cta-bbva-pen' : 'cta-ibk-usd',
        aprobado: i%4===0,
        detalle: [{ monto: (1000 + i*37).toString(), aprob: i%2===0 }]
      }));

      this.state.instructionsByType = {
        'Transferencias': [ins1, ...extra.slice(0,14)],
        'Habilitación de recursos': [ins2, ...extra.slice(14)]
      };

      this.toast('Demo cargada');
    },

    // -------- Filtros --------
    applyFilters(){ this.pagination.page = 1; },
    resetFilters(){ this.uiFilter = { tipo:'', moneda:'', q:'', fechaIni:'', fechaFin:'' }; this.pagination.page = 1; },

    // -------- Helpers --------
    sumInstruction(ins){
      if(!ins || !Array.isArray(ins.detalle)) return 0;
      return ins.detalle.reduce((sum, r) => {
        const n = parseFloat(String(r.monto || '0').replace(/[, ]/g,''));
        return sum + (isNaN(n) ? 0 : n);
      }, 0);
    },
    money(n){
      return Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits:2, maximumFractionDigits:2 });
    },
    accountAlias(id){
      const c = this.master.cuentas?.find(x => x.id === id);
      return c ? `${c.alias} · ${c.numero}` : '—';
    },

    // -------- Acciones --------
    goToInstruction(tipo, ins){
      Swal.fire({
        title: 'Editar instrucción',
        html: `
          <div style="text-align:left">
            <div><b>Tipo:</b> ${tipo}</div>
            <div><b>ID:</b> ${ins.id}</div>
            <div><b>Descripción:</b> ${ins.descripcion || '—'}</div>
            <div><b>Fecha:</b> ${ins.fecha || '—'}</div>
            <div><b>Moneda:</b> ${ins.moneda || '—'}</div>
            <div><b>Filas:</b> ${(ins.detalle||[]).length}</div>
            <div><b>Total:</b> ${this.money(this.sumInstruction(ins))}</div>
          </div>`,
        icon: 'info'
      });
    },
    async deleteInstruction(tipo, ins){
      const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar instrucción?',
        text: 'Esta acción no se puede deshacer.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar'
      });
      if(!isConfirmed) return;

      const list = this.state.instructionsByType?.[tipo] || [];
      const idx = list.findIndex(x => x.id === ins.id);
      if(idx >= 0) list.splice(idx, 1);
      this.toast('Instrucción eliminada');
      // si la página queda vacía, retrocedemos una
      if (this.pagedAll.length === 0 && this.pagination.page > 1) this.pagination.page--;
    },

    // -------- Paginación --------
    nextPage(){ if (this.pagination.page < this.totalPages) this.pagination.page++; },
    prevPage(){ if (this.pagination.page > 1) this.pagination.page--; },
    toFirst(){ this.pagination.page = 1; },
    toLast(){ this.pagination.page = this.totalPages || 1; },

    toast(text, icon='success'){
      if(!window.Swal){ console.log(`[${icon}] ${text}`); return; }
      Swal.fire({ toast:true, position:'top-end', timer:1700, showConfirmButton:false, icon, title:text });
    }
  },

  watch:{
    // Si cambias el tamaño de página, regresa a la 1
    'pagination.pageSize'(){
      this.pagination.page = 1;
    }
  },

  mounted(){
    this.loadFromLocalStorage();
    // Si no hay data, sembramos demo para que pruebes paginación
    if (!this.state.typesAdded.length) this.seedDemo();
  }
}).mount('#app');
