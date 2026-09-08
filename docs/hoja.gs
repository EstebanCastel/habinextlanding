/**
 * Apps Script del espejo de boletería de Habi Next.
 *
 * Va pegado a la hoja de cálculo (Extensiones → Apps Script), se publica como
 * aplicación web y su URL se guarda en la variable SHEETS_WEBHOOK_URL del
 * proyecto de Vercel. Existe porque la cuenta corporativa no permite service
 * accounts de GCP: sin esto no hay forma de que un servidor escriba en la hoja.
 *
 * Cómo publicarlo
 * ---------------
 * 1. Abre la hoja → Extensiones → Apps Script y pega este archivo completo.
 * 2. Cambia TOKEN por el mismo valor que quedó en SHEETS_TOKEN en Vercel.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web".
 *    - Ejecutar como: yo mismo
 *    - Quién tiene acceso: cualquier usuario
 *    (Ese "cualquier usuario" es lo que permite que Vercel llegue; el control
 *     de acceso real es el token, que se compara abajo en cada petición.)
 * 4. Copia la URL /exec y ponla en SHEETS_WEBHOOK_URL.
 *
 * Cada vez que edites este archivo hay que crear una implementación NUEVA:
 * guardar no cambia lo que responde la URL publicada.
 */

// Debe coincidir con SHEETS_TOKEN en Vercel. Cámbialo antes de publicar.
var TOKEN = 'PEGA_AQUI_EL_MISMO_SHEETS_TOKEN';

// Pestaña donde vive el espejo. Se crea sola si no existe.
var PESTANA = 'Boletería';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Dos webhooks pueden llegar en el mismo segundo. Sin este candado, dos
    // ejecuciones simultáneas leen el mismo número de fila y una pisa a la
    // otra: la persona aparece dos veces o desaparece.
    lock.waitLock(25000);

    var cuerpo = JSON.parse(e.postData.contents);
    if (!cuerpo.token || cuerpo.token !== TOKEN) {
      return responder({ ok: false, error: 'token inválido' });
    }

    var hoja = pestana();

    if (cuerpo.accion === 'reemplazar') {
      var filas = cuerpo.filas || [];
      hoja.clear();
      if (filas.length) {
        hoja.getRange(1, 1, filas.length, filas[0].length).setValues(normalizar(filas));
      }
      formatear(hoja, filas.length ? filas[0].length : 0);
      return responder({ ok: true, filas: Math.max(0, filas.length - 1) });
    }

    if (cuerpo.accion === 'upsert') {
      var encabezados = cuerpo.encabezados || [];
      var fila = cuerpo.fila || [];
      if (!fila.length) return responder({ ok: false, error: 'fila vacía' });

      // Encabezados: se escriben si la hoja está en blanco.
      if (hoja.getLastRow() === 0 && encabezados.length) {
        hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]);
        formatear(hoja, encabezados.length);
      }

      // El token del registro va en la columna A y es la llave: si ya está,
      // se reescribe esa fila; si no, se agrega al final. Así un webhook
      // repetido actualiza en vez de duplicar.
      var llave = String(fila[0]);
      var destino = buscarFila(hoja, llave);
      if (destino === -1) destino = hoja.getLastRow() + 1;

      hoja.getRange(destino, 1, 1, fila.length).setValues(normalizar([fila]));
      return responder({ ok: true, fila: destino });
    }

    return responder({ ok: false, error: 'acción desconocida' });
  } catch (err) {
    return responder({ ok: false, error: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignorado) {}
  }
}

function doGet() {
  return responder({ ok: true, servicio: 'espejo de boletería Habi Next' });
}

function pestana() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  return libro.getSheetByName(PESTANA) || libro.insertSheet(PESTANA);
}

function buscarFila(hoja, llave) {
  var ultima = hoja.getLastRow();
  if (ultima < 2) return -1;
  var columna = hoja.getRange(2, 1, ultima - 1, 1).getValues();
  for (var i = 0; i < columna.length; i++) {
    if (String(columna[i][0]) === llave) return i + 2;
  }
  return -1;
}

/**
 * Google Sheets convierte solo: un texto que empieza por "+57…" lo puede leer
 * como fórmula, y una fecha "2026-09-08 14:03" la reinterpreta según la
 * configuración regional del documento. Todo entra como texto plano para que
 * lo que se ve sea exactamente lo que mandó el servidor.
 */
function normalizar(filas) {
  return filas.map(function (fila) {
    return fila.map(function (celda) {
      if (celda === null || celda === undefined) return '';
      return typeof celda === 'number' ? celda : String(celda);
    });
  });
}

function formatear(hoja, columnas) {
  if (!columnas) return;
  var cabecera = hoja.getRange(1, 1, 1, columnas);
  cabecera.setFontWeight('bold');
  cabecera.setBackground('#802ef6');
  cabecera.setFontColor('#ffffff');
  hoja.setFrozenRows(1);
  hoja.getRange(1, 1, hoja.getMaxRows(), columnas).setNumberFormat('@'); // texto plano
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(
    ContentService.MimeType.JSON
  );
}
