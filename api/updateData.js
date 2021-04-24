const sftp = require("./tools/sftp")
const files = require("./tools/files")
const youtube = require("./tools/youtube")
const fasttext = require("./tools/fasttext")
const mongodb = require("./tools/mongodb")

const DATA_ROOT = '/root/hololive/'

async function getChannelNameMap() {
    channels = new Map()

    await sftp.doInSFTP(async (c) => {

        //Getting the ids
        await c.fastGet(DATA_ROOT + "channel_ids.py", "./channels.json");
        let ids = await files.getContent("./channels.json")
        await files.deleteFile("./channels.json")

        let _ids = JSON.parse(ids.replace("channels = ", ""))
        _ids.forEach((element, i) => {
            youtube.getNameOfChannel(element).then((name) => {
                channels.set(name.replace("/", ""), element)
            })
        })

        while (channels.size != _ids.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    })

    return channels
}

async function genPages(map) {
    let pages = []

    await sftp.doInSFTP(async () => {
        console.log("Getting current streams")
        streams = await youtube.getCurrentLiveStreams(map)
        console.log("Updating data")
        let toBeProcessed = await downloadData(streams)
        console.log("Finished refresh")
        pages = await generateDataFiles(toBeProcessed, map);
    })

    return pages;
}

async function downloadData(curr_s) {
    let toBeProcessed = new Map();

    await sftp.doInSFTP(async (c) => {
        dirs = await c.list(DATA_ROOT + "data/channels/")
        for (o in dirs) {
            files.mkdir("./data/" + dirs[o].name)

            _dirs = await c.list(DATA_ROOT + "data/channels/" + dirs[o].name)
            let TBP = [];

            for (l in _dirs) {
                if (!curr_s.includes(_dirs[l].name) && !await files.doesPathExist("./data/" + dirs[o].name + "/" + _dirs[l].name)) {
                    console.log("Downloading " + dirs[o].name + " (" + _dirs[l].name + ")");
                    await c.downloadDir(DATA_ROOT + "data/channels/" + dirs[o].name + "/" + _dirs[l].name, "./data/" + dirs[o].name + "/" + _dirs[l].name);

                    if (! await files.doesPathExist("./data/" + dirs[o].name + "/" + _dirs[l].name + "/data.json")) TBP.push(_dirs[l].name)
                } else {
                    if (curr_s.includes(_dirs[l].name)) {
                        console.log("Still streaming " + _dirs[l].name)
                    } else {
                        if (! await files.doesPathExist("./data/" + dirs[o].name + "/" + _dirs[l].name + "/data.json")) TBP.push(_dirs[l].name)
                    }
                }
            }

            if (TBP.length != 0) toBeProcessed.set(dirs[o].name, TBP)
        }
    })

    return toBeProcessed;
}

async function getDifferenceBetweenDates(d1, d2) {
    return (d1.getTime() - d2.getTime()) / 1000
}

function array_avg(array) {
    i = 0;

    array.forEach(x => {
        i += x
    })

    return i / array.length
}

function getCurrentDuration(ldt) {
    let start_time = ldt["items"][0]["liveStreamingDetails"]["actualStartTime"];
    let end_time = ldt["items"][0]["liveStreamingDetails"]["actualEndTime"];

    return Date.parse(end_time) - Date.parse(start_time);
}


async function generateDataFiles(toBeProcessed, channels) {
    var names = toBeProcessed.keys();
    let pages = [];

    for (const name of names) {
        let TBP = toBeProcessed.get(name);
        for (const id of TBP) {
            try {
                await youtube.getLiveDetails(id).then(async (ldt) => {
                    console.log(name, id)

                    let log = await files.getContent("./data/" + name + "/" + id + "/log.txt");
                    let v_log = await files.getContent("./data/" + name + "/" + id + "/v_log.txt");

                    let messages = log.split("\n");
                    raw_msgs = []
                    for (const message of messages) {
                        try {
                            let data = message.split("$%$)$1$")[1]
                            let m = message.split("$%$)$1$")[2]
                            let d_time = new Date(data.split("><")[0].slice(0, -1) + "0");
                            let lang = data.split("><")[1];
                            if (lang == "undefined") lang = await fasttext.predict(m);

                            var msg = {
                                d_time: d_time,
                                language: lang
                            }
                            raw_msgs.push(msg)
                        } catch (e) { }
                    }

                    let count = 0;
                    let last_time = new Date();
                    let first_time;
                    let langs = new Map();
                    let processed_msgs = []
                    for (const raw_message of raw_msgs) {
                        count++;
                        if (raw_message.language != "undf") {
                            if (langs.has(raw_message.language)) {
                                langs.set(raw_message.language, langs.get(raw_message.language) + 1)
                            } else langs.set(raw_message.language, 1)
                        }

                        if (last_time.getTime() != raw_message.d_time.getTime()) {
                            if (last_time.getTime() != new Date().getTime()) {
                                var msg = {
                                    time: last_time,
                                    count: count,
                                    langs: langs
                                }
                                processed_msgs.push(msg)
                                count = 0;
                                langs = new Map();
                            } else first_time = raw_message.d_time
                            last_time = raw_message.d_time
                        }
                    }

                    var data = {
                        channel_id: channels.get(name),
                        channel_name: name,
                        stream_id: id,
                        mgs_total: 0,
                        avg_mgs_pm: 0,
                        avg_views: 0,
                        lang: [],
                        lang_p: [],
                        highlights: [],
                        liveDetails: ldt["items"][0]["liveStreamingDetails"]
                    }

                    let total_identified = 0;
                    let lang_map = new Map();

                    let first_msg = first_time.getTime();
                    let length = getCurrentDuration(ldt);


                    for (let multiplicator = 1; multiplicator < 6; multiplicator++) {
                        let last = [0, 0, 0, 0, 0, 0, 0, 0]
                        let tmp = []
                        processed_msgs.forEach((i) => {
                            data.mgs_total += i.count;

                            i.langs.forEach((v, k) => {
                                if (lang_map.has(k)) {
                                    lang_map.set(k, lang_map.get(k) + v)
                                } else {
                                    lang_map.set(k, v)
                                }

                                total_identified += v;

                                if (i.count > array_avg(last) * multiplicator) {
                                    tmp.push(Date.parse(i.time) - first_msg)
                                }

                                last.push(i.count)
                                last.shift()
                            })
                        })

                        let interpoled = []
                        let _last = 0

                        tmp.forEach((x) => {
                            if ((x - 1000 * 60) > _last) {
                                interpoled.push([(x - 1000 * 30) / length, (x + 1000 * 30) / length])
                                _last = x;
                            }
                        })

                        data.highlights.push(interpoled)
                    }

                    lang_map = new Map([...lang_map.entries()].sort((a, b) => b[1] - a[1]))
                    data.lang = Array.from(lang_map.keys())
                    data.lang_p = Array.from(lang_map.values())

                    data.lang_p[0] = (data.lang_p[0] / total_identified * 100).toPrecision(2)
                    data.lang_p[1] = (data.lang_p[1] / total_identified * 100).toPrecision(2)
                    data.lang_p[2] = (data.lang_p[2] / total_identified * 100).toPrecision(2)

                    data.avg_mgs_pm = Math.round(data.mgs_total / (await getDifferenceBetweenDates(last_time, first_time) / 60))

                    messages = v_log.split("\n");
                    let index = [];
                    for (const row of messages) {
                        let details = row.split("?")

                        if (details[1] != undefined) index.push(parseInt(details[1]))
                    }
                    data.avg_views = array_avg(index)

                    files.writeJson(data, "./data/" + name + "/" + id + "/data.json", false);

                    pages.push(data)
                })
            } catch (err) { console.error("Couldn't process " + name + "'s stream " + id); }
        }
    }

    return pages;
}

files.mkdir("./data")

sftp.init().then(async () => {
    const CHANNELS = await getChannelNameMap();
    await fasttext.init()
    return await genPages(CHANNELS)
}).then(async (r) => {
    await sftp.end()
    return r;
}).then(async (r) => {
    console.log("Uploading to MongoDB");
    await mongodb.uploadToMongoDB(r);
    console.log("Data updated")
})