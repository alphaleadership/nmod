
const fs = require("fs")
const AES = require('aes256')

const FileSystem = require("fs")

function readDirR(directory) {
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

var main = function(){
    this.getkey =(length)=>{
        var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var result = '';
    for ( var i = 0; i < length; i++ ) {
        result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }
    return result;
}
 this.cryptfiles=(path,key)=>{
    const cipher = AES.createCipher(key)
var data =fs.readFileSync(path)

var crypt = cipher.encrypt(data);
fs.writeFileSync(path,crypt)
}
this.advcryptfiles=(path,key,trhead)=>{
    
for (let index = 0; index < trhead; index++) {
    this.cryptfiles(path,key)

}

}
this.crypt=(data,key)=>{
    const cipher = AES.createCipher(key)

var crypt = cipher.encrypt(data);
return crypt
}

this.decrypt=(data,key)=>{
    const cipher = AES.createCipher(key)

console.log(data)
var crypt = cipher.decrypt(data);
return crypt
}
 this.decryptfiles=(path,key)=>{
    const cipher = AES.createCipher(key)
var data =fs.readFileSync(path)

var crypt = cipher.decrypt(data);
fs.writeFileSync(path,crypt)
}
    
}

module.exports=main

