import { writeFile, writeFileText } from "./file";
import { clean, getDupIndex } from "./utility";

export function mergeDuplicateRecords(arr) {

    const processedIndexes = [];    
    const unDuped = arr.map((item,idx)=>{

        const dupIndex = getDupIndex(arr, item, idx);
        if(dupIndex === -1 || (processedIndexes as string[]).includes(idx)) return item;

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

function calculate(results) {
    const definedResults = results.filter(x => x);
    console.log("Results have been processed, there are ", definedResults.length);
    return definedResults;
}

function getRankedList(records) {
    return records.map((game,idx)=>`${idx+1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}

function getMostDisagreedUpon(records) {
    let idx = 1;

    // there is no point in getting more than top 500 as they may be poor and strange
    for(let record of records) {
        record.disagree = record.rank && record.rank > 0 && record.rank < 1000 ? record.rank - idx : -9999;
        record.nateRank = idx;
        idx++;
    }

    records.sort((a, b) => parseFloat(b.disagree) - parseFloat(a.disagree));
    return records.filter(x=>x.disagree !== -9999).map((game,idx)=>`${game.title} (${game.releaseDate}) BGG #${game.rank} -> NOW #${game.nateRank}, ${-game.disagree}`).join('\n');
}

function getMostRecent(records) {
    let output = '';
    for(let year = 2024; year > 2000; year--) {
        const games = records.filter(x=>Number(x.releaseDate) === year).map((game,idx)=>`${idx+1}. ${game.title} (${game.releaseDate}) #${game.rank}`);
        const fiftyGames = [...games].slice(0,50).join('\n');
        output += `${year}\n----------\n${fiftyGames}\n\n-----------\n`;
    }

    return output;
}

export function scoreRecordsAndRecord(records, bias, bias_multiplier, added_bias) {
    for(let record of records) {

        const biasFactor = bias === 0 ? 2 : 1 + (added_bias + Math.abs(record.weight - bias))*bias_multiplier;
        record.score = Math.pow((record.average/10), biasFactor)*Math.log10(record.num);
    }
    
    let newRecords = records.filter((x)=>!!x.score);

    newRecords.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    writeFile(newRecords,`output/output_scores_${bias}.json`);

    const list = getRankedList([...newRecords]);
    writeFileText(list, `output/output_scores_${bias}.txt`);

    const mostDisagreed = getMostDisagreedUpon([...newRecords]);
    writeFileText(mostDisagreed,`output/output_scores_${bias}_disagree.txt`);

    const mostRecent = getMostRecent([...newRecords]);
    writeFileText(mostRecent,`output/output_scores_${bias}_recent.txt`);

}

