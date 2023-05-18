
const fs = require("fs")
const AES = require('aes256')
//const log=require("log4js")
const FileSystem = fs
function filterAsciiCharacters(inputString) {
    let filteredString = '';
    for (let i = 0; i < inputString.length; i++) {
      const character = inputString.charAt(i);
      if (character.charCodeAt(0) < 128) {
        filteredString += character;
        console.log(character)
      }
    }
    return filteredString;
  }
  
class cipher{
    constructor(key){
        this.key =key
    }
    cryptfiles=(path)=>{
        const cipher = AES.createCipher(this.key)
    var data =fs.readFileSync(path)
    
    var crypt = cipher.encrypt(data);
    fs.writeFileSync(path,crypt)
    }
    advcryptfiles=(path,trhead)=>{
    
        for (let index = 0; index < trhead; index++) {
            cryptfiles(path,this.key)
        
        }
    
    }
    crypt=(data,key)=>{
        const cipher = AES.createCipher(this.key)
    
    var crypt = cipher.encrypt(data);
    return crypt
    }
    decrypt=(data,key)=>{
        const cipher = AES.createCipher(this.key)
    
    console.log(data)
    var crypt = cipher.decrypt(data);
    return crypt
    }
      decryptfiles=(path)=>{
        const cipher = AES.createCipher(this.key)
    var data =fs.readFileSync(path)
    
    var crypt = cipher.decrypt(data);
    fs.writeFileSync(path,crypt)
    }
      
        
       
}
const createCipher=cipher

const   getkey =(length)=>{
        var randomChars = fs.readFileSync("./ascii_characters.txt").toString()
    var result = '';
    for ( var i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}
 readDirR=(directory)=>{
    var returnedFiles = []
    var files = FileSystem.readdirSync(directory)
    
    for(var i=0; i<files.length; i++){
        if (FileSystem.statSync(directory+"/"+files[i]).isDirectory()) {
            returnedFiles = returnedFiles.concat(readDirR(directory+"/"+files[i]))
        } else {
            returnedFiles.push(directory+"/"+files[i])
            
            
console.log(directory+"/"+files[i])
            
        }
    }
    console.log(returnedFiles)
    return returnedFiles
    
}
class hasheur{
    constructor(key){
        this.key =key
        this.cipher=new cipher(this.key)
    }
    getHash = (data) => {
        let previous = filterAsciiCharacters(this.cipher.crypt(data, this.key));
        let next;
      
        for (let index = 0; index < 10; index++) {
          //  console.log(previous+"\n")
          next = filterAsciiCharacters(this.cipher.crypt(previous, this.key));
          previous = filterAsciiCharacters(this.cipher.crypt(next, this.key));
        }
        console.log(previous)
        return previous;
      };
      
}
exports.aes ={
    dir:readDirR,
    createCipher:createCipher,
    getkey:getkey,
    hash:hasheur

}