import { refreshStaleYears } from "./src/bgg/scraper";

refreshStaleYears().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
