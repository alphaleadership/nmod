const m=require("./test")
    const h=(data,key)=>{
        const hash= new m.hash(key)
        console.log(hash)
        return hash.getHash(data)
    }
console.log(h("m.getkey(255)",m.getkey(255)))