const express = require('express');
const router = express.Router();

const mongodb = require('../tools/mongodb')

var cache = new Map();

router.get('/all', async (req, res, next) => {     
    await mongodb.listAllStreamsBy("", true).then(r => {
        res.status(200).json(r)
    })
});

router.get('/channel/:channel_id', async (req, res, next) => {     
    const channel_id = req.params.channel_id;

    if(channel_id.length === 24){
        await mongodb.listAllStreamsBy(channel_id, true).then(r => {
            res.status(200).json(r)
        })
    }else{
        res.status(400).json({error:"bad channel_id"})
    }
});


module.exports = router;