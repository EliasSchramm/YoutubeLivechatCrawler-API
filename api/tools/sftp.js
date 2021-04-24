let Client = require('ssh2-sftp-client');
let sftp = new Client();
let config = 
{
    host: '',
    port: '',
    username: '',
    password: ''
}

const init = () => {
    return new Promise((resolve, reject) => {
        sftp.connect(config).then(() => {
            resolve()
        })
    })
}

const end = () => {
    return new Promise((resolve, reject) => {   
        sftp.end().then(() => {
            resolve(0);
        })
    })
}

async function doInSFTP(callback){    
    return await callback(sftp);  
}

module.exports = {init, doInSFTP, end}

