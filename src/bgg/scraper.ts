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
    [0,1,1.5,2,2.5,3,4,5].forEach((bias)=>scoreRecordsAndRecord([...mergedRecords], bias, 2, 0.25));
    console.log("Records recorded");

}