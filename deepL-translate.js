
const fs = require('fs');
const path = require('path');
const request = require('request');
const querystring = require('querystring');
const translate = require("deepl");

const auth_key = fs.readFileSync('deepl.auth-key', 'utf8').trim();

function translateChunk(text2Translate) {
  console.debug("Translating '" + text2Translate + "'.");
  return translate({
    free_api: true,
    text: text2Translate,
    target_lang: 'DE',
    formality: 'less',
    auth_key: auth_key,
  }).then(response => {
    console.debug("Translated to: " + response.data.translations[0].text);
    return response.data.translations[0].text;
  }).catch(error => {
    console.error(error)
    return "UNTRANSLATED: " + text2Translate;
  });
}

function translateParagraphs(paragraph) {
  const sentences = paragraph.split('.');
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
  return Promise.all(translations).then(values => values.join(' '));
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
  const files = fs.readdirSync('en').filter(file => file.startsWith("Chapter"));
  for (var idx = 0; idx <= 121; idx++) {
    const file = files[idx];
    const chapter = file.match(re)[1];
    if (process.argv.length > 2 && process.argv[2] != chapter) {
      continue;
    }
    const filename = `de/Kapitel-${chapter}.md`;
    const en_filename = path.join(__dirname, 'en', file);
    const text = fs.readFileSync(en_filename, 'utf8');
    const translated = await (await translateText(text))
      .replace('. . .', '...')
      .replace('".', '"')
      .replace('_.', '_')
      .replace('Mum', 'Mama')
      .replace('Dad', 'Papa')
      .replace('Diagon Alley', 'Winkelgasse')
      .replace('Moke', 'Eselsfell')
      .replace('Pouch', 'Beutel');
    fs.writeFileSync(filename, translated, err => {
        if (err) {
          console.error(err);
        }
        console.log("Translated chapter " + chapter + " into file " + filename + ".");
      });
  }
}

run();
