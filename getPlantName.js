
require('dotenv').config();
const fs = require('fs');

const QUEUE_FILE = './queue.json';
const PAGE_PROGRESS_FILE = './pageProgress.json';

const MAX_PAGES = 2;
console.log(`Hello`);

async function getPlants(){
    let startPage = 1;
    let allIds = [];

    //if previous queue file exists, load it
    if(fs.existsSync(QUEUE_FILE)){
        allIds = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
        console.log(`
            ${allIds.length} plants have already been saved to queue.json, resuming from page ${startPage}`);
    }

    //in order to avoid testing the same five pages over and over, store last page on a seperate file
    if(fs.existsSync(PAGE_PROGRESS_FILE)){
        const progress = JSON.parse(fs.readFileSync(PAGE_PROGRESS_FILE, 'utf8'));
        startPage = progress.nextPage;
        console.log(`Resuming - ${allIds.length} plants saved before, resuming from page ${progress.nextPage}`);
    }

    let page = startPage;
    const endPage = startPage + MAX_PAGES - 1;

    while(page <= endPage){
        const url = `https://perenual.com/api/v2/species-list?key=${process.env.PERENUAL_KEY}&page=${page}`;

        let response;
        try{
            response = await fetch(url);
        } catch(err){
            console.log(`Network error on page ${page}: ${err.message}`);
            break;
        }

        
        const rawText = await response.text();

        if(!response.ok) {
            console.log(`Stopped - API returned status ${response.status} on page ${page}`);
            console.log(`Response body:`, rawText);
            break;
        }

        let data;
        try{
            data = JSON.parse(rawText);
        } catch(err){
            console.log(`Failed to parse JSON on page ${page}, raw response was ${rawText}`)
            break;
        }

        if(!data.data || data.data.length == 0) {
            console.log('No more plants to fetch');
            break;
        }

        for(const plant of data.data){
            allIds.push({id: plant.id, common_name: plant.common_name});
        }

        fs.writeFileSync(QUEUE_FILE, JSON.stringify(allIds, null, 2));
        fs.writeFileSync(PAGE_PROGRESS_FILE, JSON.stringify({nextPage: page + 1}));

        console.log(`Page ${page}: found ${data.data.length} plants (total so far ${allIds.length})`);

        if(page >= data.last_page){
            console.log('Reached last page.');
            break;
        }
        page++;

    }
    console.log(`Saved ${allIds.length} plant IDs to queue.json`);
}

getPlants();