const fs = require('fs')
const download = require('download');

async function getContent(filepath){
    return await fs.readFileSync(filepath, 'utf8');
}

async function deleteFile(filepath){
    fs.unlinkSync(filepath)
}

async function mkdir(filepath){
    if (!fs.existsSync(filepath)){
        fs.mkdirSync(filepath);
    }
}

async function doesPathExist(filepath){
    return await fs.existsSync(filepath)
}

async function downloadFile(filepath, url){
    await download(filepath, url);
}

async function writeJson(json , filepath, beautify){
    var j_obj = "";
    
    if(beautify){
        j_obj = JSON.stringify(json, null, 4)
    }else{
        j_obj = JSON.stringify(json);
    }
    await fs.writeFileSync(filepath, j_obj, 'utf8', () => {});
}

module.exports = {getContent, deleteFile, mkdir, doesPathExist, downloadFile, writeJson}