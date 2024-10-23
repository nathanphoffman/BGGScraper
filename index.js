const axios = require('axios');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('node:fs');
//


function getLink(min_weight, max_weight) {
    return `https://boardgamegeek.com/search/boardgame?sort=rank&advsearch=1&q=&include%5Bdesignerid%5D=&include%5Bpublisherid%5D=&geekitemname=&range%5Byearpublished%5D%5Bmin%5D=&range%5Byearpublished%5D%5Bmax%5D=&range%5Bminage%5D%5Bmax%5D=&range%5Bnumvoters%5D%5Bmin%5D=&range%5Bnumweights%5D%5Bmin%5D=&range%5Bminplayers%5D%5Bmax%5D=&range%5Bmaxplayers%5D%5Bmin%5D=&range%5Bleastplaytime%5D%5Bmin%5D=&range%5Bplaytime%5D%5Bmax%5D=&floatrange%5Bavgrating%5D%5Bmin%5D=&floatrange%5Bavgrating%5D%5Bmax%5D=&floatrange%5Bavgweight%5D%5Bmin%5D=${min_weight}&floatrange%5Bavgweight%5D%5Bmax%5D=${max_weight}&colfiltertype=&searchuser=taloskhaos&nosubtypes%5B0%5D=boardgameexpansion&playerrangetype=normal&B1=Submit`;
}


function cleanup(txt) {
    return txt.replace(/[^\d.-]/g, '');
}

function calculate(results) {
    const definedResults = results.filter(x => x);
    console.log("Results have been processed, there are ", definedResults.length);
    return definedResults;
}

function memoize(link) {

    let data = {};

    const config = {
        url: link,
        method: 'get',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
    };

    try {
        dataString = fs.readFileSync('cache.txt', 'utf8');
        data = JSON.parse(dataString);
        if (data && data[link]) {
            console.log("found cache for ", link)
            return Promise.resolve({ data: data[link], type: "cache" });
        }
        else {
            
        throw "this should not happen, in offline mode!";    
        return axios(config).then((response) => {
            console.log("called out for ", link);
            data[link] = response.data;
            writeFile(data,'cache.txt');
            return { data: response.data, type: "call" };
        });
        }
    }
    catch (err) {
        console.log("a cache error was encountered");
        console.log(err);
    }
}

function writeFile(obj,name) {
    const json = JSON.stringify(obj);

    fs.writeFile(name, json, err => {
        if (err) {
            console.log("file not written to, an error was encountered.");
            console.error(err);
        } else {
            console.log("file written successfully");
        }
    });

}

function writeFileText(text,name) {

    fs.writeFile(name, text, err => {
        if (err) {
            console.log("file not written to, an error was encountered.");
            console.error(err);
        } else {
            console.log("file written successfully");
        }
    });

}


function getObjects(min, max) {

    return memoize(getLink(min, max))
        .then(function (response) {
            const dom = new JSDOM(response.data);

            let nodesArr = [...dom.window.document.querySelectorAll('table#collectionitems tr')];
            // remove header column
            nodesArr.splice(0, 1);

            const results = nodesArr.map(game => {
                if (game) {
                    const title = [...game.querySelectorAll('a.primary')];
                    if (title[0]?.textContent) {
                        //console.log("processed game");

                        const average = [...game.querySelectorAll('td.collection_bggrating')][1];
                        const num_ratings = [...game.querySelectorAll('td.collection_bggrating')][2];
                        const rank = [...game.querySelectorAll('td.collection_rank')][0]; 
                        const releaseDate = [...game.querySelectorAll('span.smallerfont')][0];

                        return {
                            title: title[0].textContent,
                            average: cleanup(average.textContent),
                            weight: (Number(min) + Number(max)) / 2,
                            num: cleanup(num_ratings.textContent),
                            rank: cleanup(rank.textContent),
                            releaseDate: cleanup(releaseDate?.textContent ?? "")
                        }
                    }
                }
            });

            return { data: results, type: response.type };


            //console.log(dom);

            //return response.data.items;
        });

}

getAllWeights();

async function getAllWeights() {
    /*
        getObjects(2,2.1).then((data)=>{
            //console.log(data);
        });
      */

    const arr = [];
    for (let count = 1; count < 4.9; count += 0.1) {
        const min = Number(count - 0.01).toFixed(2);
        const max = Number(count + 0.11).toFixed(2)
        const { type, data } = await getObjects(min, max);
        arr.push(...data);

        console.log("the data has length ", data.length);
        console.log("the results were", type);

        console.log("getting objects for, ", min, max);

        // base 5 second wait
        const duration = 5000 + Math.random() * 1000 * 30;
        console.log("waiting for ", duration);
        if(type === "call") await sleep(duration);
        //await sleep(200); // forced 500 ms delay so the thing doesn't run off the rails blowing up their servers.
    }

    console.log("array has length ", arr.length);

    const arrDefined = clean(arr);
    arrDefined.push({
        "title": "King of Tokyo: Duel",
        "average": "7.37",
        "weight": 2.27,
        "num": "153",
        "releaseDate": "2024"    
    });


    writeFile(arrDefined,'output/output_before.json');
    const mergedRecords = mergeDuplicateRecords(arrDefined);
    writeFile(mergedRecords,'output/output_after.json');

    // best settings I found was a bias multipler of x2 and a bias addition of 0.25 (ontop of the +1) using the 1.8-weight output
    [0,1,1.5,1.6,1.7,1.8,1.9,2,2.5,3,4,5].forEach((bias)=>scoreRecordsAndRecord([...mergedRecords], bias, 2, 0.25));
    console.log("Records recorded");

}

function getRankedList(records) {
    return records.map((game,idx)=>`${idx+1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}

function getMostDisagreedUpon(records) {
    let idx = 1;
    for(record of records) {
        record.disagree = record.rank && record.rank > 0 && idx < 500 ? record.rank - idx : -9999;
        record.nateRank = idx;
        idx++;
    }

    records.sort((a, b) => parseFloat(b.disagree) - parseFloat(a.disagree));
    return records;
}

function scoreRecordsAndRecord(records, bias, bias_multiplier, added_bias) {
    for(record of records) {

        const biasFactor = bias === 0 ? 2 : 1 + (added_bias + Math.abs(record.weight - bias))*bias_multiplier;
        record.score = Math.pow((record.average/10), biasFactor)*Math.log10(record.num);
    }
    
    records.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    writeFile(records,`output/output_scores_${bias}.json`);

    const list = getRankedList([...records]);
    writeFileText(list, `output/output_scores_${bias}.txt`);

    const mostDisagreed = getMostDisagreedUpon([...records]);
    writeFile(mostDisagreed,`output/output_scores_${bias}_disagree.json`);

}


function getDupIndex(arr,item,index) {

    let idx = 0;
    for(element of arr) {
        if(element.title === item.title && idx !== index) return idx;
        idx++;
    }

    return -1;
}

function mergeDuplicateRecords(arr) {

    const processedIndexes = [];    
    const unDuped = arr.map((item,idx)=>{

        const dupIndex = getDupIndex(arr, item, idx);
        if(dupIndex === -1 || processedIndexes.includes(idx)) return item;

        // merge weights for more accurate reading -- as dups means they caught on either end of the divide of pagination by weighting
        const dupItem = arr[dupIndex];
        processedIndexes.push(Number(dupIndex));

        console.log(dupItem);
        console.log(item);
        arr[dupIndex].weight = (dupItem.weight + item.weight)/2;
        return;
    })

    const cleanedunDuped = clean(unDuped);
    return cleanedunDuped;

}

function clean(arr) {
    return arr.filter(x=>x);
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

