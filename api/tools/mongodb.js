const USER = ""
const PASSWORD = "";
const CLUSTER = ""

const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://<user>:<password>@<cluster>?retryWrites=true&w=majority".replace("<user>", USER).replace("<password>", PASSWORD).replace("<cluster>", CLUSTER);
var client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function uploadToMongoDB(data) {
    if (data != []) {

        var client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

        await client.connect(async err => {
            console.log(err);
            const collection = await client.db("data").collection("data");

            await collection.insertMany(data)
            client.close();
        });
    }
}

async function getData(stream_id){    
    return new Promise(async (resolve, reject) => {

        var ret;
        var client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

        client.connect(async (err) => {

            const collection = client.db("data").collection("data");

            const query = { stream_id: stream_id };    
            const options = {
                projection: { _id: 0, channel_id: 1, channel_name: 1, avg_mgs_pm: 1, avg_views: 1, stream_id: 1, lang: 1, lang_p: 1, highlights : 1, mgs_total: 1 },
            };

            ret = await collection.findOne(query, options)

            ret.lang = ret.lang.slice(0, 3);
            ret.lang_p = ret.lang_p.slice(0, 3);

            client.close()

            resolve(ret)      
        });        
    })    
}

async function listAllStreamsBy(id, minimal){
    return new Promise(async (resolve, reject) => {

        var ret;
        var client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

        client.connect(async (err) => {

            const collection = client.db("data").collection("data");

            const query = id === "" ? {} : {channel_id:id};
            const options = {
                sort: {date: -1},
                projection: minimal ? {_id: 0, stream_id: 1} : {  _id: 0, channel_id: 1, channel_name: 1, avg_mgs_pm: 1, stream_id: 1},
            };

            var cursor = await collection.find(query, options)
            ret = []

            await cursor.forEach((i) => {
                ret.push(i)
            })

            client.close()

            resolve(ret)      
        });        
    })    
}

module.exports = { uploadToMongoDB, getData, listAllStreamsBy}

