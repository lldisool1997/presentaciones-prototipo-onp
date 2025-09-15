 $(function(){

            //HELPER PARA RESETEAR SECCIONES
            function resetSections(){
                $('#camposGenerales').hide();
                $('#seccionLlamado').hide();
                $('#seccionDistribucion').hide();
                $('#tieneCustodioOpciones').hide();
                $('#noCustodioOpciones').hide();
                $('#btnEnviarInstruccion').hide();
                $('#btnComunicarOGR').hide();
                $('#btnSolicitarOADTE').hide();
                $('#instruirOperacion').prop('checked', false);
                $('#comunicarRegistro').prop('checked', false);
                $('#solicitarConfirmacion').prop('checked', false);
                $('input[name="custodio"]').prop('checked', false);
            }

            function generarRegistro(tipo){
                const ts = Date.now().toString().slice(-5);
                const year = new Date().getFullYear();
                return 'REG-' + year + '-' + tipo.toUpperCase().slice(0,3) + '-' + ts;
            }

            // Tipo seleccionado
            $('.tipo-radio').on('change', function(){
                resetSections();
                $('#camposGenerales').show();
                const v = $(this).val();
                if(v === 'llamado'){
                    $('#seccionLlamado').show();
                } else {
                    $('#seccionDistribucion').show();
                }
            });

            // Instruir operación control visual
            $('#instruirOperacion').on('change', function(){
                if($(this).is(':checked')) $('#btnEnviarInstruccion').show();
                else $('#btnEnviarInstruccion').hide();
            });

            // Enviar instrucción para Llamado -> OAD.TE
            $('#btnEnviarInstruccion').on('click', function(){
                const tipo = $('input[name="tipo"]:checked').val();
                if(tipo !== 'llamado') return;
                // We simulate sending
                Swal.fire({
                    icon: 'success',
                    title: 'Instrucción enviada',
                    text: 'Se envió la instrucción al Operador de Tesorería FCR (OAD.TE).'
                });
            });

            // Custodio radios
            $('.custodio-radio').on('change', function(){
                $('#tieneCustodioOpciones').hide();
                $('#noCustodioOpciones').hide();
                $('#btnComunicarOGR').hide();
                $('#btnSolicitarOADTE').hide();
                $('#comunicarRegistro').prop('checked', false);
                $('#solicitarConfirmacion').prop('checked', false);
                if($(this).val() === 'si'){
                    $('#tieneCustodioOpciones').show();
                } else {
                    $('#noCustodioOpciones').show();
                }
            });

            // Mostrar botones cuando se marcan las opciones
            $('#comunicarRegistro').on('change', function(){
                if($(this).is(':checked')) $('#btnComunicarOGR').show(); else $('#btnComunicarOGR').hide();
            });
            $('#solicitarConfirmacion').on('change', function(){
                if($(this).is(':checked')) $('#btnSolicitarOADTE').show(); else $('#btnSolicitarOADTE').hide();
            });

            // Comunicación a OGR (si tiene custodio)
            $('#btnComunicarOGR').on('click', function(){
                Swal.fire({
                    icon: 'success',
                    title: 'Comunicación enviada',
                    text: 'Se envió la comunicación al Analista de Valorización de Inversiones (OGR).'
                });
            });

            // Solicitud a OAD.TE (si no tiene custodio)
            $('#btnSolicitarOADTE').on('click', function(){
                Swal.fire({
                    icon: 'success',
                    title: 'Solicitud enviada',
                    text: 'Se envió la solicitud de confirmación de la transferencia al Operador de Tesorería FCR (OAD.TE).'
                });
            });

            // Guardar registro (genera número y muestra)
            $('#btnGuardar').on('click', function(){
                const tipo = $('input[name="tipo"]:checked').val();
                if(!tipo){
                    Swal.fire({ icon: 'warning', title: 'Seleccione un tipo', text: 'Por favor seleccione Llamado, Distribución o Retorno.' });
                    return;
                }
                // Basic check for required fields (fondo, gestor)
                const fondo = $('[name="fondo"]').val();
                const gestor = $('[name="gestor"]').val();
                if(!fondo || !gestor){
                    Swal.fire({ icon: 'warning', title: 'Falta información', text: 'Complete Nombre del fondo y Gestor.' });
                    return;
                }
                const reg = generarRegistro(tipo);
                // Simula guardado
                $('#registroInfo').text('Registro: ' + reg);
                Swal.fire({
                    icon: 'success',
                    title: 'Datos guardados',
                    html: `Registro generado: <strong>${reg}</strong>`
                });
            });

            // Inicializar
            resetSections();
        });