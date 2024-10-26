import { writeFile } from "../file";
import { mergeDuplicateRecords, scoreRecordsAndRecord } from "../objectBuilder";
import { clean, sleep } from "../utility";
import { getObjects } from "./parser";


export async function getAllWeights() {
    /*
        getObjects(2,2.1).then((data)=>{
            //console.log(data);
        });
      */

    const arr = [];
    for (let count = 1; count < 4.9; count += 0.03) {
        const min = Number(count - 0.01).toFixed(2);
        const max = Number(count + 0.04).toFixed(2)
        console.log(min,max);
        
        const { type, data } = await getObjects(min, max);
        arr.push(...data);

        console.log("the data has length ", data.length);
        console.log("the results were", type);

        console.log("getting objects for, ", min, max);

        // base 3 second wait
        const duration = 3000 + Math.random() * 1000 * (Math.random()*30);
        if(type === "call") {
            console.log("made a call to bgg, sleeping for ", duration);
            await sleep(duration);
        }
    }

    console.log("array has length ", arr.length);

    const arrDefined = clean(arr);
    /*
    arrDefined.push({
        "title": "King of Tokyo: Duel",
        "average": "7.37",
        "weight": 2.27,
        "num": "153",
        "releaseDate": "2024"    
    });
*/

    const mergedRecords = mergeDuplicateRecords(arrDefined);

    mergedRecords.sort((a, b) => parseFloat(a.rank) - parseFloat(b.rank));
    const ranks = mergedRecords.map(x=>Number(x.rank));

    for(let i = 1; i<100000; i++) {
        if(!ranks.includes(i)) {
            console.log("The max bgg rank represented continuously is up to ", i);
            break;
        }
    }

    // best settings I found was a bias multipler of x2 and a bias addition of 0.25 (ontop of the +1) using the 1.8-weight output
    [0,1,1.5,1.6,1.7,1.8,1.9,2,2.1,2.2,2.3,2.4,2.5,3,3.5,4,4.5,5].forEach((bias)=>scoreRecordsAndRecord([...mergedRecords], bias, 2, 0.25));
    console.log("Records recorded");

}