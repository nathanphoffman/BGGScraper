export function cleanup(txt) {
    return txt.replace(/[^\d.-]/g, '');
}

export function clean(arr) {
    return arr.filter(x=>x);
}

export function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function getDupIndex(arr,item,index) {

    let idx = 0;
    for(let element of arr) {
        if(element.title === item.title && element.releaseDate === item.releaseDate && idx !== index) return idx;
        idx++;
    }

    return -1;
}