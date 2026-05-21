import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const CACHE_DIR = 'cache';

function cachePathForUrl(url: string): string {
    const hash = crypto.createHash('md5').update(url).digest('hex');
    return path.join(CACHE_DIR, `${hash}.html`);
}

function readCache(url: string): string | null {
    const filePath = cachePathForUrl(url);
    if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf8');
    }
    return null;
}

function writeCache(url: string, html: string): void {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR);
    }
    fs.writeFileSync(cachePathForUrl(url), html, 'utf8');
}

async function fetchWithBrowser(link: string): Promise<string> {
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });
        return await page.content();
    } finally {
        await browser.close();
    }
}

export function memoize(link: string): Promise<{ data: string; type: string }> {
    try {
        const cached = readCache(link);
        if (cached) {
            console.log("found cache");
            return Promise.resolve({ data: cached, type: "cache" });
        }

        console.log("NO CACHE FOUND - MAKING CALL TO BGG");
        return fetchWithBrowser(link).then((html) => {
            writeCache(link, html);
            return { data: html, type: "call" };
        });
    }
    catch (err) {
        console.log("a cache error was encountered");
        throw err;
    }
}
