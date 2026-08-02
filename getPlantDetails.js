
require('dotenv').config();
const fs = require('fs');
const pool = require('./db.js');

const QUEUE_FILE = './queue.json';
const LIMIT = 20;

const downloadAndStoreImage = require('./savePlantImages');

async function plantDetails(){
    if(!fs.existsSync(QUEUE_FILE)){
        console.log(`Currently there is no queue. Run getPlantName.js first to populate the queue.`);
        return;
    }

    let queue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    console.log(`Starting sync, ${queue.length} plants in queue.`);

    let processed = 0;
    let inserted = 0;

    while(queue.length > 0 && processed < LIMIT){
        const { id } = queue[0];

        const url = `https://perenual.com/api/v2/species/details/${id}?key=${process.env.PERENUAL_KEY}`;

        let response;
        try{
            response = await fetch(url);
        } catch(err){
            console.log(`Network error on plant ID ${id}: ${err.message}`);
            break;
        }

        const rawText = await response.text();
        processed++;

        if(!response.ok){
            console.log(`Stopped - API returned status ${response.status} on plant ID ${id}`);
            console.log(`Response body:`, rawText);
            break;
        }

        let p;
        try{
            p = JSON.parse(rawText);
        } catch(err){
            console.log(`Failed to parse JSON for plant ID ${id}, response was ${rawText}`);
            break;
        }

        const permanentImageURL = await downloadAndStoreImage(p.id, p.default_image?.regular_url ?? null);

        try{
            await pool.query(
                `INSERT INTO plants (plantid, sunlight, cycletype, droughts, flowers, fruits, maintenance,
                latinname, description, watering, soiltype, hardinesszonelower, hardinesszoneupper,
                plantname, poisonoustopets, poisonoustohumans, indoors, floweringseason, image1url) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                ON CONFLICT (plantid) DO NOTHING`,
                [
                    p.id,
                    p.sunlight ?? [],
                    p.cycle ? [p.cycle] : [],
                    p.drought_tolerant ?? null,
                    p.flowers ?? null,
                    p.fruits ?? null,
                    p.maintenance ?? null,
                    p.scientific_name?.[0] ?? null,
                    p.description ?? null,
                    p.watering ? [p.watering] : [],
                    p.soil ?? [],
                    p.hardiness?.min ?? null,
                    p.hardiness?.max ?? null,
                    p.common_name ?? null,
                    p.poisonous_to_humans ?? null,
                    p.poisonous_to_pets ?? null,
                    p.indoor ?? null,
                    p.flowering_season ? [p.flowering_season] : [],
                    permanentImageURL,
                ]
            );
            inserted++;
            console.log(`Inserted plant ID ${id} (${p.common_name ?? 'unknown name'}) - ${processed} / ${LIMIT}`);
        } catch(err){
            console.log(`Database error on plant ID ${id}: ${err.message}`);
            break;
        }

        //Remove from queue only after successful insertion
        queue.shift();
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
    }

    console.log(`Finished. Processed ${processed} API calls to Perenual, inserted ${inserted} new plants into the PostgresSQL database, 
        ${queue.length} plants remaining in the queue.`);

    await pool.end();
}

plantDetails();