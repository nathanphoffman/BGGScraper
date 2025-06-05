import { mergeDuplicateRecords, scoreRecordsAndRecord } from "../objectBuilder";
import { clean, sleep } from "../utility";
import { getObjects } from "./parser";


export async function getAllWeights() {

    const arr = [];
    // weights on bgg range from 1 to 5, but in practice there is no reason a weight should ever be anywhere close to 4.9 or above 
    // unless there is an anamoly, which we wouldn't want to pull in anyway
    for (let count = 1; count < 4.9; count += 0.03) {

        // a slight margin to account for rounding, duplicate board games are removed later on
        const min = Number(count - 0.01).toFixed(2);
        const max = Number(count + 0.04).toFixed(2)

        console.log(min, max);

        const { type, data } = await getObjects(min, max);
        arr.push(...data);

        console.log("the data has length ", data.length);
        console.log("the results were", type);
        console.log("getting objects for, ", min, max);

        // base 3 second wait
        const duration = 3000 + Math.random() * 1000 * (Math.random() * 30);
        if (type === "call") {
            console.log("made a call to bgg, sleeping for ", duration);
            await sleep(duration);
        }
    }

    console.log("array has length ", arr.length);

    const arrDefined = clean(arr);

    // custom overrides
    arrDefined.push({
        "title": "Honey Buzz Custom",
        "average": "7.55",
        "weight": 2.5, // weight override
        "num": "7676",
        "releaseDate": "2020"
    });

    const removedRecords = removeUnwantedRecords(arrDefined);
    const mergedRecords = mergeDuplicateRecords(removedRecords);

    mergedRecords.sort((a, b) => parseFloat(a.rank) - parseFloat(b.rank));
    const ranks = mergedRecords.map(x => Number(x.rank));

    for (let i = 1; i < 100000; i++) {
        if (!ranks.includes(i)) {
            console.log("The max bgg rank represented continuously is up to ", i);
            break;
        }
    }

    // best settings I found was a bias multipler of x2 and a bias addition of 0.25 (ontop of the +1) using the 1.8-weight output
    //[0,1,2,3,4,5].forEach((bias)=>scoreRecordsAndRecord([...mergedRecords], bias, 2));
    [0, 1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 3, 3.5, 3.4, 3.6, 3.8, 4, 4.5, 5].forEach((bias) => scoreRecordsAndRecord([...mergedRecords], bias, 4));
    //[0,1,2,3,4,5].forEach((bias)=>scoreRecordsAndRecord([...mergedRecords], bias, 4));
    console.log("Records recorded");

}

function removeUnwantedRecords(records) {
    const unwatedRecordsRemoved = records.filter(x => !(
        x.title.toUpperCase().startsWith('UNDAUNTED')
        || x.title.toUpperCase().startsWith('UNMATCHED')
        || x.title.toUpperCase().startsWith('CLANK!')
        || x.title.toUpperCase().startsWith('TICKET TO RIDE')
        || x.title.toUpperCase().startsWith('MARVEL')
        || x.title.toUpperCase().startsWith('ZOMBICIDE')
        || x.title.toUpperCase().startsWith('UNLOCK')
        || x.title.toUpperCase().startsWith('DISNEY')
        || x.title.toUpperCase().startsWith('CHRONICLES OF CRIME')
        || x.title.toUpperCase().startsWith('DICE THRONE')
    ));

    return unwatedRecordsRemoved;
}