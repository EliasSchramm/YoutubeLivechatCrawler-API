const files = require("./files")
const path = require('path');
const fastText = require('fasttext');

var model;
var classifier;

const PREDICTION_THRESHOLD = 0.5;

async function init(){

    //Downloading fasttext model
    if(! await files.doesPathExist("./lid.176.bin")){
        console.log("Fatsttext model not found. Downloading")
        await files.downloadFile("https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin", "./")
        console.log("Fattext model downloaded")
    }else{
        console.log("Fasttext model already available.");
    }

    //Init the model

    model = path.resolve('./lid.176.bin');
    classifier = new fastText.Classifier(model);    

    predict("Hallop")
}

async function predict(s){
    let ret = "undf"
    
    await classifier.predict(s, 1)
    .then((res) => {
        if (res.length > 0) {
            if(res[0].value > PREDICTION_THRESHOLD){
                ret = res[0].label.replace("__label__", "")
            }            
        }             
    });

    return ret;
}

module.exports = {init, predict}