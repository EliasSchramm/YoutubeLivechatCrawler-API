const express = require('express');
const router = express.Router();

const mongodb = require('../tools/mongodb')

var cache = new Map();

router.get('/:stream_id', async (req, res, next) => {    
    const stream_id = req.params.stream_id;

    if (stream_id.length === 11){
        var details = {};
    
        if(cache.has(stream_id)){
            details = cache.get(stream_id);
        }else{
            await mongodb.getData(stream_id).then(r => {
                details = r;
                cache.set(stream_id, details)
            });
        }
        
        if(details == null){
            res.status(404).json({error:"stream not in memory"})
        }else{
            res.status(200).json(details);
        }
        
    }else{
        res.status(400).json({error:"bad stream_id"})
    }

});


module.exports = router;