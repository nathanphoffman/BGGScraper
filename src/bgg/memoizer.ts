
import { getFileText, writeFile } from "../file";
import axios from "axios";

const HEADER_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36';
const HEADER_ACCEPT = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8';


export function memoize(link) {

    let data = {};

    const config = {
        url: link,
        method: 'get',
        headers: {
            'User-Agent': HEADER_USER_AGENT,
            'Accept': HEADER_ACCEPT,
        }
    };

    try {
        let dataString = getFileText('cache.txt');
        data = JSON.parse(dataString);
        if (data && data[link]) {
            console.log("found cache")
            return Promise.resolve({ data: data[link], type: "cache" });
        }
        else {

            // !! hack for now until config is implemented
            //throw "this should not happen, in offline mode!";

            // !! this is a hack for now until we can figure out axios types 
            return axios(config).then((response) => {
                console.log("NO CACHE FOUND - MAKING CALL TO BGG");
                data[link] = response.data;
                writeFile(data, 'cache.txt');
                return { data: response.data, type: "call" };
            });
        }
    }
    catch (err) {
        console.log("a cache error was encountered");
        console.log(err);
    }
}