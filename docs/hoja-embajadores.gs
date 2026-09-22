/**
 * Habi Next · la hoja de enlaces del equipo, refrescada sola.
 *
 * Pegar en Extensiones → Apps Script de la hoja de Google, guardar, recargar
 * la hoja y usar el menú «Habi Next»:
 *
 *   1. «Guardar token»: pega el valor de HOJA_TOKEN (una sola vez; queda en
 *      las propiedades del script, no en ninguna celda).
 *   2. «Actualizar ahora»: prueba que trae los datos.
 *   3. «Activar actualización automática»: cada 5 minutos, para siempre.
 *
 * La pestaña se busca por su gid, así que se puede renombrar sin romper nada.
 * El script solo lee de habinext.com y escribe en esa pestaña; no toca las
 * demás.
 */

const URL_DATOS = "https://www.habinext.com/api/hoja/embajadores";
const ID_HOJA = "1z_mVlJ1A7IU8ruLiSw3B88u8UgGdR9SYFd9PLazAyvc";
const GID_PESTANA = 1025878679;
const CADA_MINUTOS = 5;

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Habi Next")
    .addItem("Actualizar ahora", "actualizar")
    .addSeparator()
    .addItem("Activar actualización automática", "instalar")
    .addItem("Desactivar actualización automática", "desinstalar")
    .addSeparator()
    .addItem("Guardar token", "guardarToken")
    .addToUi();
}

function guardarToken() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt("Token de habinext.com", "Pega el valor de HOJA_TOKEN:", ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const token = r.getResponseText().trim();
  if (token.length < 32) {
    ui.alert("Ese token parece incompleto.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty("HOJA_TOKEN", token);
  ui.alert("Token guardado. Ahora dale a «Actualizar ahora».");
}

/**
 * El token: primero el que se guardó desde el menú; si no, el que vino con
 * el script al subirlo con clasp (`secreto.gs`, que no está en el repo).
 */
function tokenGuardado() {
  const propio = PropertiesService.getScriptProperties().getProperty("HOJA_TOKEN");
  if (propio) return propio;
  return typeof HOJA_TOKEN_EMBEBIDO === "string" && HOJA_TOKEN_EMBEBIDO ? HOJA_TOKEN_EMBEBIDO : null;
}

function pestana() {
  // Por id y no por «la hoja activa»: así funciona igual desde el menú, desde
  // el disparador de tiempo y desde la dirección web.
  const hoja = SpreadsheetApp.openById(ID_HOJA)
    .getSheets()
    .find((s) => s.getSheetId() === GID_PESTANA);
  if (!hoja) throw new Error("No encuentro la pestaña con gid " + GID_PESTANA);
  return hoja;
}

function actualizar() {
  const hoja = pestana();
  const token = tokenGuardado();
  const columnaEstado = 18; // R: dos columnas después de la tabla

  if (!token) {
    hoja.getRange(1, columnaEstado).setValue("Falta el token: menú Habi Next → Guardar token");
    return;
  }

  try {
    const res = UrlFetchApp.fetch(URL_DATOS, {
      headers: { Authorization: "Bearer " + token },
      muteHttpExceptions: true,
    });
    if (res.getResponseCode() !== 200) {
      throw new Error("habinext.com respondió " + res.getResponseCode());
    }
    const datos = JSON.parse(res.getContentText());
    const cabecera = datos.cabecera;
    const filas = datos.filas;
    const columnas = cabecera.length;

    hoja.getRange(1, 1, 1, columnas).setValues([cabecera]).setFontWeight("bold");
    if (filas.length) {
      hoja.getRange(2, 1, filas.length, columnas).setValues(filas);
    }
    // Lo que sobre de una corrida anterior con más filas se limpia.
    const sobrantes = hoja.getMaxRows() - filas.length - 1;
    if (sobrantes > 0) {
      hoja.getRange(filas.length + 2, 1, sobrantes, columnas).clearContent();
    }
    hoja.setFrozenRows(1);

    const cuando = Utilities.formatDate(new Date(), "America/Bogota", "d MMM yyyy, HH:mm");
    hoja.getRange(1, columnaEstado).setValue("Actualizado " + cuando);
    hoja.getRange(2, columnaEstado).setValue(
      filas.length + " enlaces · " + datos.resumen.traidos + " registros traídos de " + datos.resumen.registros
    );
  } catch (e) {
    hoja.getRange(1, columnaEstado).setValue("Error al actualizar: " + e.message);
    throw e;
  }
}

function instalar(avisar) {
  desinstalar();
  ScriptApp.newTrigger("actualizar").timeBased().everyMinutes(CADA_MINUTOS).create();
  if (avisar !== false) {
    SpreadsheetApp.getUi().alert("Listo: la hoja se actualiza sola cada " + CADA_MINUTOS + " minutos.");
  }
}

function hayDisparador() {
  return ScriptApp.getProjectTriggers().some((t) => t.getHandlerFunction() === "actualizar");
}

/**
 * La dirección web del script. Abrirla una vez, con la cuenta dueña de la
 * hoja, hace las tres cosas de golpe: autoriza el script, actualiza la
 * pestaña y deja puesto el disparador de cada 5 minutos. Sirve también para
 * forzar una actualización desde afuera.
 */
function doGet(e) {
  const clave = e && e.parameter ? e.parameter.k : "";
  const esperada = typeof CLAVE_WEB === "string" ? CLAVE_WEB : "";
  if (!esperada || clave !== esperada) {
    return HtmlService.createHtmlOutput("<p style='font-family:sans-serif'>Esta dirección necesita su clave.</p>");
  }
  try {
    actualizar();
    if (!hayDisparador()) instalar(false);
    const hoja = pestana();
    const estado = hoja.getRange(2, 18).getValue();
    return HtmlService.createHtmlOutput(
      "<div style='font-family:sans-serif;max-width:32rem;margin:3rem auto;line-height:1.5'>" +
        "<h2 style='margin:0 0 .5rem'>Hoja actualizada</h2>" +
        "<p>" + estado + ".</p>" +
        "<p>La actualización automática queda activa cada " + CADA_MINUTOS + " minutos. Ya puedes cerrar esta pestaña.</p>" +
        "</div>"
    );
  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<p style='font-family:sans-serif'>No se pudo actualizar: " + err.message + "</p>"
    );
  }
}

function desinstalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "actualizar")
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
