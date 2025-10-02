/*  Datos mock para selects (cámbialos por tu backend)  */
const BANCOS = [
  { id: 'BCP', text: 'Banco de Crédito del Perú (BCP)' },
  { id: 'SCOTIA', text: 'SCOTIABANK' },
  { id: 'BBVA', text: 'BBVA' },
  { id: 'INTER', text: 'INTERBANK' },
];
const CUENTAS = {
  BCP: ['193-1990153-0-54', '193-8645423-52'],
  SCOTIA: ['012-9876543-00', '012-5555555-90'],
  BBVA: ['0011-123456-00-01'],
  INTER: ['777-000111-22']
};

const $transferList = $('#transferList');
const $tpl = $('#tplTransferencia');

/* --- Helpers --- */
function initSelect2($sel, items) {
  $sel.select2({ data: items, placeholder: 'Selecciona...', width: '100%' });
}

function loadCuentas($selCuenta, bancoId) {
  const items = (CUENTAS[bancoId] || []).map(n => ({ id: n, text: n }));
  $selCuenta.empty().select2({ data: items, width: '100%' });
}

function renumerarTransferencias() {
  $transferList.find('.transferencia').each((i, el) => {
    $(el).find('.num').text(i + 1);
  });
}

/* Aplica Cleave a un input de monto */
function attachMoneyMask(input) {
  new Cleave(input, {
    numeral: true,
    numeralThousandsGroupStyle: 'thousand',
    numeralDecimalScale: 2
  });
}

/* --- Crear una tarjeta de transferencia --- */
function crearTransferencia() {
  const $node = $($tpl.html());

  // Select2: bancos y cuentas
  const $bancoCargo   = $node.find('.sel-banco-cargo');
  const $cuentaCargo  = $node.find('.sel-cuenta-cargo');
  const $bancoDestino = $node.find('.sel-banco-destino');
  const $cuentaDestino= $node.find('.sel-cuenta-destino');

  initSelect2($bancoCargo, BANCOS);
  initSelect2($bancoDestino, BANCOS);
  initSelect2($cuentaCargo, []);
  initSelect2($cuentaDestino, []);

  // Cargar cuentas al cambiar banco
  $bancoCargo.on('change', function(){
    loadCuentas($cuentaCargo, this.value);
  });
  $bancoDestino.on('change', function(){
    loadCuentas($cuentaDestino, this.value);
  });

  // Monto con máscara
  attachMoneyMask($node.find('.txt-monto')[0]);

  // Eliminar
  $node.find('.btnEliminarTransferencia').on('click', () => {
    $node.remove();
    renumerarTransferencias();
  });

  $transferList.append($node);
  renumerarTransferencias();
}

/* --- Init --- */
$(function(){
  // Registro OC: select2 y máscaras
  initSelect2($('#oc_banco_cargo'), BANCOS);
  initSelect2($('#oc_banco_destino'), BANCOS);
  initSelect2($('#oc_cuenta_cargo'), []);
  initSelect2($('#oc_cuenta_destino'), []);

  $('#oc_banco_cargo').on('change', function(){ loadCuentas($('#oc_cuenta_cargo'), this.value); });
  $('#oc_banco_destino').on('change', function(){ loadCuentas($('#oc_cuenta_destino'), this.value); });

  attachMoneyMask(document.getElementById('oc_importe_origen'));
  attachMoneyMask(document.getElementById('oc_importe_destino'));

  // Botón añadir transferencia
  $('#btnAddTransferencia').on('click', crearTransferencia);

  // Form instruir (demo)
  $('#formOperacion').on('submit', function(e){
    e.preventDefault();

    // Valida que exista al menos una transferencia
    if ($transferList.children().length === 0) {
      toastr.warning('Agrega al menos una transferencia.');
      return;
    }

    // Aquí puedes recolectar los datos para enviarlos al backend
    const transferencias = [];
    $transferList.find('.transferencia').each(function(){
      transferencias.push({
        moneda: $(this).find('.sel-moneda').val(),
        monto:  $(this).find('.txt-monto').val(),
        banco_cargo: $(this).find('.sel-banco-cargo').val(),
        cuenta_cargo: $(this).find('.sel-cuenta-cargo').val(),
        banco_destino: $(this).find('.sel-banco-destino').val(),
        cuenta_destino: $(this).find('.sel-cuenta-destino').val(),
      });
    });

    const oc = {
      moneda_origen: $('#oc_moneda_origen').val(),
      importe_origen: $('#oc_importe_origen').val(),
      tipo_cambio: $('#oc_tipo_cambio').val(),
      moneda_destino: $('#oc_moneda_destino').val(),
      importe_destino: $('#oc_importe_destino').val(),
      banco_cargo: $('#oc_banco_cargo').val(),
      cuenta_cargo: $('#oc_cuenta_cargo').val(),
      banco_destino: $('#oc_banco_destino').val(),
      cuenta_destino: $('#oc_cuenta_destino').val(),
      fecha: $('#oc_fecha').val(),
      transferencias
    };

    // Demo de confirmación
    Swal.fire({
      title: 'Confirmar instrucción',
      text: `Se enviará ${transferencias.length} transferencia(s).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Volver'
    }).then(res => {
      if (res.isConfirmed) {
        console.log('Payload a enviar:', oc);
        toastr.success('Instrucción registrada');
        // aquí harías tu POST
      }
    });
  });

  // Cancelar
  $('#btnCancelar').on('click', function(){
    Swal.fire({ icon:'info', title:'Acción cancelada', timer:1300, showConfirmButton:false });
  });
});
