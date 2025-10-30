
const { createApp } = Vue;

createApp({
  data(){
    return {
      operaciones: [
        { id: '1', fecha: '2025-10-01', glosa: 'Transferencia a proveedor ABC', estado: 'Completada' },
        { id: '2', fecha: '2025-10-05', glosa: 'Transferencia interna de fondos', estado: 'Pendiente' },
        { id: '3', fecha: '2025-10-10', glosa: 'Pago de salario mes septiembre', estado: 'Completada' }
      ],
      uiFilter: { q: '', fechaIni: '', fechaFin: '' },
      pagination: { page: 1, pageSize: 10 }
    };
  },
  computed: {
    filteredAll() {
      const { q, fechaIni, fechaFin } = this.uiFilter;
      return this.operaciones.filter(op => {
        const matchFecha = (!fechaIni || op.fecha >= fechaIni) && (!fechaFin || op.fecha <= fechaFin);
        const matchTexto = !q || op.glosa.toLowerCase().includes(q.toLowerCase());
        return matchFecha && matchTexto;
      });
    },
    totalPages() {
      return Math.ceil(this.filteredAll.length / this.pagination.pageSize);
    },
    pageFrom() {
      return (this.pagination.page - 1) * this.pagination.pageSize + 1;
    },
    pageTo() {
      const to = this.pagination.page * this.pagination.pageSize;
      return Math.min(to, this.filteredAll.length);
    },
    pagedAll() {
      const start = (this.pagination.page - 1) * this.pagination.pageSize;
      return this.filteredAll.slice(start, start + this.pagination.pageSize);
    }
  },
  methods: {
    applyFilters() {
      this.pagination.page = 1;
    },
    resetFilters() {
      this.uiFilter = { q: '', fechaIni: '', fechaFin: '' };
      this.pagination.page = 1;
    },
    goToOperacion(operacion) {
      console.log('Ver operación: ', operacion);
    },
    nextPage() {
      if (this.pagination.page < this.totalPages) this.pagination.page++;
    },
    prevPage() {
      if (this.pagination.page > 1) this.pagination.page--;
    },
    toFirst() {
      this.pagination.page = 1;
    },
    toLast() {
      this.pagination.page = this.totalPages;
    }
  }
}).mount('#app');
