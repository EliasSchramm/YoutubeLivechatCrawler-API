const { json } = require('express');
const request = require('request')

const STREAM_REQ_BASE = "https://www.youtube.com/channel/[id]/live";
const CHANNEL_REQ_BASE = "https://youtube.googleapis.com/youtube/v3/channels?part=snippet&id=[id]&key=[key]";
const VIDEO_DETAIL_REQ_BASE = "https://www.googleapis.com/youtube/v3/videos?id=[id]&part=snippet,liveStreamingDetails&key=[key]"
const API_KEY = ""

async function getCurrentLiveStreams(map){
    
    let streams = []
    let i = 0;
    map.forEach((v, k) => {
        isChannelStreaming(v).then(r => {
            if(r != ""){            
                streams.push(r)
            }

            i++;
        })         
    })

    while(map.size != i){
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return streams
    

}    

const isChannelStreaming = (id) => {
    return new Promise((resolve, reject) => {
        request(STREAM_REQ_BASE.replace("[id]", id), (error, response, body) => {

            if (!error && response.statusCode == 200) {
                if(body.includes("Top Chat") && !body.includes('"playabilityStatus":{"status":"LIVE_STREAM_OFFLINE"')){
                    
                    body = body.split('<link rel="canonical" href=')[1]
                    body = body.split('>')[0]
                    body = body.split("\"")[1]
                    body = body.replace("https://www.youtube.com/watch?v=", "")                    
                    
                    resolve(body)
                }else{
                    resolve("")
                }
            }
        });
    })
}

async function getNameOfChannel(id) {
    return await new Promise((resolve, reject) => {        
        request(CHANNEL_REQ_BASE.replace("[id]", id).replace("[key]", API_KEY), function (error, response, body) {
            if (!error && response.statusCode == 200) {
                let json = JSON.parse(body)
                resolve(json["items"][0]["snippet"]["title"])
            }
        });
    })
}

async function getLiveDetails(id){
    return await new Promise((resolve, reject) => {

            request(VIDEO_DETAIL_REQ_BASE.replace("[id]", id).replace("[key]", API_KEY), function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    let json = JSON.parse(body)
                    resolve(json)
                }
            });
    })
}


module.exports = {isChannelStreaming, getNameOfChannel, getCurrentLiveStreams, getLiveDetails}




