const http = require('http');
const https = require('https');
const fs = require('fs')

const express = require('express');
const port = 42070;

const app = express();
const getRoute = require('./api_routes/get')
const listRoute = require('./api_routes/list')

const cors = require('cors')

app.use(cors({ origin: true }));
app.use('/get', getRoute);
app.use('/list', listRoute);

app.get('*', function(req, res){
    res.status(404).json({"error": "path not fount"});
});
  

const server = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app)

server.listen(port);