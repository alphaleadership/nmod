var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// dist/index.js
var require_dist = __commonJS({
  "dist/index.js"(exports2) {
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __commonJS2 = (cb, mod) => function __require() {
      return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    var require_aes256 = __commonJS2({
      "node_modules/.pnpm/aes256@1.1.0/node_modules/aes256/index.js"(exports22, module22) {
        var crypto = require("crypto");
        var CIPHER_ALGORITHM = "aes-256-ctr";
        var aes256 = {
          /**
           * Encrypt a clear-text message using AES-256 plus a random Initialization Vector.
           * @param {String} key  A passphrase of any length to used to generate a symmetric session key.
           * @param {String|Buffer} input  The clear-text message or buffer to be encrypted.
           * @returns {String|Buffer} A custom-encrypted version of the input.
           * @public
           * @method
           */
          encrypt: function(key, input) {
            if (typeof key !== "string" || !key) {
              throw new TypeError('Provided "key" must be a non-empty string');
            }
            var isString = typeof input === "string";
            var isBuffer = Buffer.isBuffer(input);
            if (!(isString || isBuffer) || isString && !input || isBuffer && !Buffer.byteLength(input)) {
              throw new TypeError('Provided "input" must be a non-empty string or buffer');
            }
            var sha256 = crypto.createHash("sha256");
            sha256.update(key);
            var iv = crypto.randomBytes(16);
            var cipher2 = crypto.createCipheriv(CIPHER_ALGORITHM, sha256.digest(), iv);
            var buffer = input;
            if (isString) {
              buffer = Buffer.from(input);
            }
            var ciphertext = cipher2.update(buffer);
            var encrypted = Buffer.concat([iv, ciphertext, cipher2.final()]);
            if (isString) {
              encrypted = encrypted.toString("base64");
            }
            return encrypted;
          },
          /**
           * Decrypt an encrypted message back to clear-text using AES-256 plus a random Initialization Vector.
           * @param {String} key  A passphrase of any length to used to generate a symmetric session key.
           * @param {String|Buffer} encrypted  The encrypted message to be decrypted.
           * @returns {String|Buffer} The original plain-text message or buffer.
           * @public
           * @method
           */
          decrypt: function(key, encrypted) {
            if (typeof key !== "string" || !key) {
              throw new TypeError('Provided "key" must be a non-empty string');
            }
            var isString = typeof encrypted === "string";
            var isBuffer = Buffer.isBuffer(encrypted);
            if (!(isString || isBuffer) || isString && !encrypted || isBuffer && !Buffer.byteLength(encrypted)) {
              throw new TypeError('Provided "encrypted" must be a non-empty string or buffer');
            }
            var sha256 = crypto.createHash("sha256");
            sha256.update(key);
            var input = encrypted;
            if (isString) {
              input = Buffer.from(encrypted, "base64");
              if (input.length < 17) {
                throw new TypeError('Provided "encrypted" must decrypt to a non-empty string or buffer');
              }
            } else {
              if (Buffer.byteLength(encrypted) < 17) {
                throw new TypeError('Provided "encrypted" must decrypt to a non-empty string or buffer');
              }
            }
            var iv = input.slice(0, 16);
            var decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, sha256.digest(), iv);
            var ciphertext = input.slice(16);
            var output;
            if (isString) {
              output = decipher.update(ciphertext) + decipher.final();
            } else {
              output = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
            }
            return output;
          }
        };
        function AesCipher(key) {
          if (typeof key !== "string" || !key) {
            throw new TypeError('Provided "key" must be a non-empty string');
          }
          Object.defineProperty(this, "key", { value: key });
        }
        AesCipher.prototype.encrypt = function(plaintext) {
          return aes256.encrypt(this.key, plaintext);
        };
        AesCipher.prototype.decrypt = function(encrypted) {
          return aes256.decrypt(this.key, encrypted);
        };
        aes256.createCipher = function(key) {
          return new AesCipher(key);
        };
        module22.exports = aes256;
      }
    });
    var fs = require("fs");
    var AES = require_aes256();
    var FileSystem = fs;
    function filterAsciiCharacters(inputString) {
      let filteredString = "";
      for (let i = 0; i < inputString.length; i++) {
        const character = inputString.charAt(i);
        if (character.charCodeAt(0) < 128) {
          filteredString += character;
        }
      }
      return filteredString;
    }
    var cipher = class {
      constructor(key) {
        this.key = key;
      }
      cryptfiles = (path) => {
        const cipher2 = AES.createCipher(this.key);
        var data = fs.readFileSync(path);
        var crypt = cipher2.encrypt(data);
        fs.writeFileSync(path, crypt);
      };
      advcryptfiles = (path, trhead) => {
        for (let index = 0; index < trhead; index++) {
          cryptfiles(path, this.key);
        }
      };
      crypt = (data, key) => {
        const cipher2 = AES.createCipher(this.key);
        var crypt = cipher2.encrypt(data);
        return crypt;
      };
      decrypt = (data, key) => {
        const cipher2 = AES.createCipher(this.key);
        console.log(data);
        var crypt = cipher2.decrypt(data);
        return crypt;
      };
      decryptfiles = (path) => {
        const cipher2 = AES.createCipher(this.key);
        var data = fs.readFileSync(path);
        var crypt = cipher2.decrypt(data);
        fs.writeFileSync(path, crypt);
      };
    };
    var createCipher = cipher;
    var getkey = (length) => {
      var randomChars = fs.readFileSync("./ascii_characters.txt").toString();
      var result = "";
      for (var i = 0; i < length; i++) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
      }
      return result;
    };
    readDirR = (directory) => {
      var returnedFiles = [];
      var files = FileSystem.readdirSync(directory);
      for (var i = 0; i < files.length; i++) {
        if (FileSystem.statSync(directory + "/" + files[i]).isDirectory()) {
          returnedFiles = returnedFiles.concat(readDirR(directory + "/" + files[i]));
        } else {
          returnedFiles.push(directory + "/" + files[i]);
          console.log(directory + "/" + files[i]);
        }
      }
      console.log(returnedFiles);
      return returnedFiles;
    };
    var hasheur = class {
      constructor(key) {
        this.key = key;
        this.cipher = new cipher(this.key);
      }
      gethash = (data) => {
        let previous = filterAsciiCharacters(this.cipher.crypt(data, this.key));
        for (let index = 0; index < 1e4; index++) {
          let next = filterAsciiCharacters(this.cipher.crypt(previous2, this.key));
          let previous2 = filterAsciiCharacters(this.cipher.crypt(next, this.key));
        }
        return previous;
      };
    };
    exports2.aes = {
      dir: readDirR,
      createCipher,
      getkey,
      hash: hasheur
    };
  }
});

// test.js
var { aes } = require_dist();
module.exports = aes;
