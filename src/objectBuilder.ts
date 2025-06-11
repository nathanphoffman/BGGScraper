import { writeFile, writeFileText, makeDirectory } from "./file";
import { clean, getDupIndex } from "./utility";

export function mergeDuplicateRecords(arr) {

    const processedIndexes = [];
    const unDuped = arr.map((item, idx) => {

        const dupIndex = getDupIndex(arr, item, idx);
        if (dupIndex === -1 || (processedIndexes as string[]).includes(idx)) return item;

        // merge weights for more accurate reading -- as dups means they caught on either end of the divide of pagination by weighting
        const dupItem = arr[dupIndex];
        processedIndexes.push(Number(dupIndex));
        arr[dupIndex].weight = (dupItem.weight + item.weight) / 2;
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
    return records.map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}

function getMostDisagreedUpon(records) {
    let idx = 1;

    // there is no point in getting more than top 500 as they may be poor and strange
    for (let record of records) {
        record.disagree = record.rank && record.rank > 0 && record.rank < 1000 ? record.rank - idx : -9999;
        record.nateRank = idx;
        idx++;
    }

    records.sort((a, b) => parseFloat(b.disagree) - parseFloat(a.disagree));
    return records.filter(x => x.disagree !== -9999).map((game, idx) => `${game.title} (${game.releaseDate}) BGG #${game.rank} -> NOW #${game.nateRank}, ${-game.disagree}`).join('\n');
}

function getMostRecent(records) {
    let output = '';
    for (let year = 2025; year > 2000; year--) {
        const games = records.filter(x => Number(x.releaseDate) === year).map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`);
        const fiftyGames = [...games].slice(0, 75).join('\n');
        output += `${year}\n----------\n${fiftyGames}\n\n-----------\n`;
    }

    return output;
}

function getNewGameBias(records) {

    // +1 covers the games that are newest releases
    const currentYear = 2025 + 1;
    const decadeOld = currentYear - 5;
    const twoDecadesOld = decadeOld - 5;
    const modifier = 1.15;

    for (let record of records) {
        // if it is a very old game or we don't know the date we punish it even more:
        if (!record.releaseDate || record.releaseDate < twoDecadesOld) {
            record.score = record.score * (2 - modifier);
        }
        else {
            const year = record.releaseDate < decadeOld ? decadeOld : record.releaseDate;
            record.score = record.score * (1 + Math.pow(year - decadeOld, modifier) / 25);
        }
    }

    records.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
    return records.map((game, idx) => `${idx + 1}. ${game.title} (${game.releaseDate}) #${game.rank}`).join('\n');
}


function getScoreWithBias(record, bias, bias_ignore) {

    let bias_distance = Math.abs(record.weight - bias);
    let max_distance = bias < 2.5 ? 5 - bias : bias - 1;
    let bias_coefficient = 4/max_distance;

    const bias_base = 2; // this is a small bias incase bias_consideration is 0, if it was 1 there would be no bias at all

    /*
            Bias consideration should be between 1 and 4:
            0.5 = biased
            1: heavy bias
            2: very heavy bias
            3: ultra bias
    */

    const biasFactor = bias === 0 ? bias_base : bias_base * (1 + bias_distance * bias_coefficient);

    // 10% bias penalty
    //const BIAS_PENALTY = 1;
    //const average = Number(record.average) < BIAS_PENALTY ? BIAS_PENALTY : Number(record.average) - BIAS_PENALTY;
    //const perfectScorePenaltyRemovalCorrection = 2 - Math.pow(1 - BIAS_PENALTY/10, bias_base);

    const calculatedBias = getCalculatedBias(Number(record.average), biasFactor, record.num);
    return calculatedBias;
}

function getCalculatedBias(score, biasFactor, numberOfRatings) {
    return Math.pow((score / 10), biasFactor) * Math.log10(numberOfRatings);
}

export function getRecordsWithBias(records, bias, bias_multiplier) {

    for (let record of records) {
        record.score = getScoreWithBias(record, bias, bias_multiplier);
    }

    return getRecordsWithScores(records);

}

function getRecordsWithScores(records) {
    let newRecords = [...records.filter((x) => !!x.score)];
    return newRecords;
}

export function getRecordsWithLightToHeavyBias(records) {

    for (let record of records) {
        if(!record.weight || isNaN(record.weight)) continue;
        const newBias = record.weight < 2 ? 2 : 1.33 + record.weight/3;
        record.score = getCalculatedBias(record.score, newBias, record.num);
    }

    return getRecordsWithScores(records);

}

export function scoreRecordsAndRecord(records, bias, bias_multiplier) {

    makeDirectory(getPath(String(bias), String(bias_multiplier)), () => {

        const newRecords = getRecordsWithBias(records, bias, bias_multiplier);

        const bias_multiplier_copy: string = String(bias_multiplier);
        const bias_copy: string = String(bias);

        const path: string = getPath(bias_copy, bias_multiplier_copy);

        //!! create an output folder!!!
        newRecords.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
        writeFile(newRecords, `${path}/raw_objects.json`);

        const list = getRankedList([...newRecords]);
        writeFileText(list, `${path}/ALL_RANKINGS.txt`);

        if (bias === 0) {
            const preparedRecords = getRecordsWithLightToHeavyBias([...records]);
            preparedRecords.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));
            const heavyBias = getRankedList([...preparedRecords]);
            writeFileText(heavyBias, `${path}/BIASED_AGAINST_HEAVY.txt`); 
        }

        const mostDisagreed = getMostDisagreedUpon([...newRecords]);
        writeFileText(mostDisagreed, `${path}/disagreement.txt`);

        const mostRecent = getMostRecent([...newRecords]);
        writeFileText(mostRecent, `${path}/RANKINGS_BY_YEAR.txt`);

        const favorNewGames = getNewGameBias([...newRecords]);
        writeFileText(favorNewGames, `${path}/RANKINGS_BIAS_NEW.txt`);

    });

}

function getPath(bias: string, bias_multiplier: string) {
    /*
        let multiplier_text = {
            "2": "somewhat",
            "3": "",
            "4": "VERY much"
        }[bias_multiplier];
    */
    /*
        let dir: string = 'output/' + {
            "0": `0 - I prefer ALL games`,
            "1": `1 - I prefer light games`,
            "2": `2 - I prefer medium-light games`,
            "2.2": `2.2 - ish`,
            "2.5": `2.5 - mediumish`,
            "3": `3 - I prefer medium games`,
            "4": `4 - I prefer medium-heavy games`,
            "5": `5 - I prefer heavy games`
        }[bias];
        
        */

    return `output/${bias}`;
};

