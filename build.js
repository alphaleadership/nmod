const fs = require('fs');

function writeAsciiCharactersToFile(filename) {
  let content = '';
  for (let i = 0; i < 128; i++) {
    const character = String.fromCharCode(i);
    content += character;
  }

  fs.writeFileSync(filename, content);
}
writeAsciiCharactersToFile('./ascii_characters.txt');
