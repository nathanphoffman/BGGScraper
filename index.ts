import { getAllWeights } from "./src/bgg/scraper";

getAllWeights().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
