 $(function(){

        // Inicialmente ocultamos secciones
        $('#sustento_llamado, #sustento_otros').hide();
        $('#instruccionOperacion').hide()
        $('#custodioSection').hide()

        function tipoActivo(){
        return $('input[name="tipo"]:checked').val(); // 'llamado' | 'distribucion' | 'retorno' | undefined
        }

        // Vaciar todos los valores del formulario, excepto el radio "tipo"
        function resetValoresFormulario(){
        // inputs de texto, número, fecha y file
        $('#formRegistro').find('input[type="text"], input[type="number"], input[type="date"], input[type="file"]')
            .val('');

        // selects
        $('#formRegistro').find('select').prop('selectedIndex', 0);

        // radios y checkboxes (excepto los de "tipo")
        $('#formRegistro').find('input[type="radio"], input[type="checkbox"]').not('[name="tipo"]')
            .prop('checked', false);

        // limpiar mensajes auxiliares
        $('#registroInfo').text('');
        }


        //REGLA DE VALIDACIÓN DE CAMPOS REQUERIDOS PARA MOSTRAR SUSTENTO E INSTRUCCIÓN DE ACUERDO AL TIPO
        function checkCamposPorTipo(){
            const t = tipoActivo();
            if(t === 'llamado'){
                checkCamposLlamadoDeCapital();
            } else if(t === 'distribucion' || t === 'retorno'){
                checkCamposOtros();
            } else {
                // sin tipo aún seleccionado
                resetSustento();
                $('#sustento_llamado, #sustento_otros').hide();
                $('#instruccionOperacion').hide();
                $('#custodioSection').hide();
            }
        }
        
        // Listener simple para validar si todos los campos están llenos
        function checkCamposLlamadoDeCapital(){
            const fondo    = $('[name="fondo"]').val()?.trim();
            const gestor   = $('[name="gestor"]').val()?.trim();
            const fecha    = $('[name="fecha"]').val()?.trim();
            const moneda   = $('[name="moneda"]').val()?.trim();
            const numLlam  = $('[name="num_llamado"]').val()?.trim();
            const montoLlam= $('[name="monto_llamado"]').val()?.trim();
            const ctaFcr   = $('[name="cta_fcr_desde"]').val()?.trim();
            const ctaGestor= $('[name="cta_gestor"]').val()?.trim();

            if(fondo && gestor && fecha && moneda && numLlam && montoLlam && ctaFcr && ctaGestor){
                $('#sustento_llamado').show();
                $('#sustento_otros').show();
                //$('#custodioSection').show();
            } else {
                $('#sustento_llamado').hide();
                resetSustento();
            }
        }

        function checkCamposOtros(){
            const fondo    = $('[name="fondo"]').val()?.trim();
            const gestor   = $('[name="gestor"]').val()?.trim();
            const fecha    = $('[name="fecha"]').val()?.trim();
            const moneda   = $('[name="moneda"]').val()?.trim();
            const numDist  = $('[name="num_distribucion"]').val()?.trim();
            const montoDist= $('[name="monto_distribucion"]').val()?.trim();
            const ctaHacia   = $('[name="cta_fcr_hacia"]').val()?.trim();

            if(fondo && gestor && fecha && moneda && numDist && montoDist && ctaHacia){
                $('#sustento_llamado').show();
                $('#sustento_otros').show();
                //$('#custodioSection').show();
            } else {
                $('#sustento_llamado').hide();
                resetSustento();
            }
        }

        function resetSustento(){
            const carta_num_llamado    = $('[name="carta_num_llamado"]').val("")
            const carta_file_llamado   = $('[name="carta_file_llamado"]').val("")
        }

        function mostrarInstruccion(){
            $('#instruccionOperacion').show();
        }

        function mostrarCustodio(){
            $('#custodioSection').show();
        }



        // Escucha cualquier cambio en esos inputs
        $('[name="fondo"], [name="gestor"], [name="fecha"], [name="moneda"], [name="num_llamado"], [name="monto_llamado"], [name="cta_fcr_desde"], [name="cta_gestor"], [name="num_distribucion"], [name="monto_distribucion"], [name="cta_fcr_hacia"]')
        .on('input change', checkCamposPorTipo);


        function resetSeccionesSustentoInstruccion(){
             $('#sustento_llamado, #sustento_otros').hide();
            $('#instruccionOperacion').hide()
            $('#custodioSection').hide()
        }

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
                resetSeccionesSustentoInstruccion();
            }

            function generarRegistro(tipo){
                const ts = Date.now().toString().slice(-5);
                const year = new Date().getFullYear();
                return 'REG-' + year + '-' + tipo.toUpperCase().slice(0,3) + '-' + ts;
            }

            // Tipo seleccionado
            $('.tipo-radio').on('change', function(){
                resetSections();
                resetValoresFormulario();
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
                mostrarInstruccion();
                mostrarCustodio();
            });

            // Inicializar
            resetSections();
        });