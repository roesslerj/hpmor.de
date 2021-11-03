
const fs = require('fs');
const path = require('path');
const request = require('request');
const querystring = require('querystring');
const translate = require('deepl');
const error_prefix = 'UNTRANSLATED: ';

const auth_key = fs.readFileSync('deepl.auth-key', 'utf8').trim();

var errorCnt = 0;

function translateChunk(text2Translate) {
  if (!/\w+/.test(text2Translate)) {
    console.debug(`Text does not contain chars to translate: ${text2Translate}`);
    return text2Translate;
  }
  return translate({
    free_api: true,
    text: text2Translate,
    target_lang: 'DE',
    formality: 'less',
    auth_key: auth_key,
  }).then(response => {
    console.debug(`Translated this:  ${text2Translate}`);
    console.debug(`Translated to:    ${response.data.translations[0].text}`);
    return response.data.translations[0].text;
  }).catch(error => {
    console.error(`Error ${error.code} translating: ${text2Translate}`);
    errorCnt++;
    return error_prefix + text2Translate;
  });
}

function translateParagraphs(paragraph) {
  const sentences = paragraph.replaceAll('Mr.', 'Mr ').split('.');
  const translations = [];
  for (var idx = 0; idx < sentences.length; idx++) {
    const sentence = sentences[idx];
    if (sentence.trim() == '') {
      if (idx < sentences.length -1) {
        translations.push(Promise.resolve('.'));
      }
      continue;
    }
    translations.push(translateChunk(sentence.trim() + '.'));
  }
  return Promise.all(translations)
    .then(values => values.join(' '))
    .then(values => values.replaceAll('Mr ', 'Mr. '))
    .then(values => values.replaceAll('" ', '"'));
}

function translateText(text) {
  const paragraphs = text.split('\n\n');
  const translations = [];
  for (var idx = 0; idx < paragraphs.length; idx++) {
    paragraph = paragraphs[idx];
    if (paragraph.trim() == '') {
      sentenceTranslations.push(Promise.resolve('\n\n'));
      continue;
    }
    translations.push(translateParagraphs(paragraph.trim()));
  }
  return Promise.all(translations).then(values => values.join('\n\n'));
}

const re = /Chapter (\d*) .*/i;

async function run() {
  const files = fs.readdirSync('en').filter(file => file.startsWith('Chapter'));
  for (var idx = 0; idx <= 121; idx++) {
    const file = files[idx];
    const chapter = file.match(re)[1];
    if (process.argv.length > 2 && process.argv[2] != chapter) {
      continue;
    }
    const filename = `de/Kapitel-${chapter}.md`;
    const en_filename = path.join(__dirname, 'en', file);
    const text = fs.readFileSync(en_filename, 'utf8');
    const nextChapter = chapter + 1;
    const translated = await (await translateText(text))
      .replaceAll('. . .', '...')
      .replaceAll('* * *.', '* * *')
      .replaceAll('".', '"')
      .replaceAll('_.', '_')
      .replaceAll(' -".', '."')
      .replaceAll('," ', '", ')
      .replaceAll('Mum', 'Mama')
      .replaceAll('Dad', 'Papa')
      .replaceAll('Diagon Alley', 'Winkelgasse')
      .replaceAll('Leaky Cauldron', 'Tropfender Kessel')
      .replaceAll('Moke', 'Eselsfell')
      .replaceAll('Mokeskin', 'Eselsfell')
      .replaceAll('Mokassin', 'Eselsfell')
      .replaceAll('Pouch', 'Beutel')
      .replaceAll('Präfektin', 'Vertrauensschülerin')
      .replaceAll('Präfekt', 'Vertrauensschüler')
      .replaceAll('Comed-Tea', 'Seltsaft')
      .replaceAll('Time-Turner', 'Zeitumkehrer')
      .replaceAll('Zeitdreher', 'Zeitumkehrer')
      .replaceAll('Dark Lord', 'Dunkler Lord')
      .replaceAll('Herr ', 'Mr. ')
      .replaceAll('. "\n', '."\n')
      .replaceAll('Aftermath', 'Nachspiel')
      .replaceAll('Muggle', 'Muggel')
      .replaceAll('Snitch', 'Schnatz')
      .replaceAll('verklären', 'verwandeln')
      .replaceAll('verklärt', 'verwandelt')
      .replaceAll('Verklärung', 'Transformation')
      .replaceAll('Transfiguration', 'Transformation')
      .replaceAll('der-lebte', 'der-lebt')
      .replaceAll('Sunshine', 'Sonnenschein')
      .replaceAll('Sunny', 'Sonnenschein')
      .replaceAll('Chaotics', 'Chaotischen')
      .replaceAll('\{\\an8\}', '_')
      .concat(`\n\n→ [Kapitel ${nextChapter}](Kapitel-${nextChapter}.md)\n`);
    console.log("\n\n\n");
    console.log(`Writing translated chapter ${chapter} into file ${filename} with ${errorCnt} errors.\n`);
    fs.writeFileSync(filename, '# ' + translated, err => {
        if (err) {
          console.error(err);
        }
      });
  }
}

run();
