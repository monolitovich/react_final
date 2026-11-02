// базовые корни нецензурной и грубой лексики
const OBSCENE_PATTERNS = [
  /ху[йиеёяюи]/i,
  /п[иеё]зд/i,
  /еб[аеёиу]/i,
  /ёб/i,
  /бл[яяа]/i,
  /сук[аиое]/i,
  /муд[аое]/i,
  /г[ао]вн/i,
  /дерьм/i,
  /шлюх/i,
  /чм[оы]/i,
  /залуп/i,
  /дроч/i,
  /пид[аое]р/i,
  /гандон/i,
  /сра/i,
  /жоп/i,
  /гондон/i
];

// очистка и нормализация похожих символов и транслита
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[@aа]/g, 'а')
    .replace(/[bб6]/g, 'б')
    .replace(/[vв]/g, 'в')
    .replace(/[gг]/g, 'г')
    .replace(/[dд]/g, 'д')
    .replace(/[eеё]/g, 'е')
    .replace(/[zhж]/g, 'ж')
    .replace(/[zз3]/g, 'з')
    .replace(/[iи1!|]/g, 'и')
    .replace(/[kк]/g, 'к')
    .replace(/[lл]/g, 'л')
    .replace(/[mм]/g, 'м')
    .replace(/[nн]/g, 'н')
    .replace(/[oо0]/g, 'о')
    .replace(/[pп]/g, 'п')
    .replace(/[rр]/g, 'р')
    .replace(/[sс$]/g, 'с')
    .replace(/[tт]/g, 'т')
    .replace(/[uуy]/g, 'у')
    .replace(/[fф]/g, 'ф')
    .replace(/[hх]/g, 'х')
    .replace(/[cц]/g, 'ц')
    .replace(/[chч]/g, 'ч')
    .replace(/[shш]/g, 'ш')
    .replace(/[yaя]/g, 'я');
}

// проверка наличия нецензурной лексики
export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  const normalized = normalizeText(text);
  return OBSCENE_PATTERNS.some((pattern) => pattern.test(normalized));
}