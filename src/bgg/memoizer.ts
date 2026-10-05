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

// one browser is shared by every request, it is opened on the first call to bgg
let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function fetchWithBrowser(link: string): Promise<string> {
    browser ??= await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    try {
        await page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });
        return await page.content();
    } finally {
        await page.close();
    }
}

export async function closeBrowser(): Promise<void> {
    await browser?.close();
    browser = null;
}

export type FetchSource = "cache" | "call";

export async function memoize(link: string): Promise<{ data: string; type: FetchSource }> {
    try {
        const cached = readCache(link);
        if (cached) {
            return { data: cached, type: "cache" };
        }

        const html = await fetchWithBrowser(link);
        writeCache(link, html);
        return { data: html, type: "call" };
    }
    catch (err) {
        console.log("an error was encountered fetching or caching", link);
        throw err;
    }
}
