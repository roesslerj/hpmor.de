
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
    if (sentence.trim().startsWith(error_prefix)) {
      translations.push(translateChunk(sentence.replace(error_prefix, '').trim() + '.'));
    }
    else {
      translations.push(Promise.resolve(sentence.trim() + '.'));
    }
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

async function run() {
  const chapter = process.argv[2];
  const filename = `de/Kapitel-${chapter}.md`;
  const text = fs.readFileSync(filename, 'utf8');
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
    .replaceAll('Herr. ', 'Mr. ')
    .replaceAll('. "\n', '."\n')
    .replaceAll('verklären', 'verwandeln')
    .replaceAll('Aftermath', 'Nachspiel')
    .replaceAll('\{\\an8\}', '_');
  console.log("\n\n\n");
  console.log(`Updating translated chapter ${chapter} in file ${filename} with ${errorCnt} errors.\n`);
  fs.writeFileSync(filename, translated, err => {
      if (err) {
        console.error(err);
      }
    });
}

run();
