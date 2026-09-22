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

function pestana() {
  const hoja = SpreadsheetApp.getActive()
    .getSheets()
    .find((s) => s.getSheetId() === GID_PESTANA);
  if (!hoja) throw new Error("No encuentro la pestaña con gid " + GID_PESTANA);
  return hoja;
}

function actualizar() {
  const hoja = pestana();
  const token = PropertiesService.getScriptProperties().getProperty("HOJA_TOKEN");
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

function instalar() {
  desinstalar();
  ScriptApp.newTrigger("actualizar").timeBased().everyMinutes(CADA_MINUTOS).create();
  SpreadsheetApp.getUi().alert("Listo: la hoja se actualiza sola cada " + CADA_MINUTOS + " minutos.");
}

function desinstalar() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "actualizar")
    .forEach((t) => ScriptApp.deleteTrigger(t));
}
