require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db.js') //Points to Supabase after updating .env 

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/plants/search', async (req, res) => {
    console.log('Incoming query params: ', req.query);
    const { sunlight, watering, soiltype, cycletype, hardinesszone, droughts, fruits, flowers } = req.query;

    let conditions = [];
    let values = [];
    let paramIndex = 1;

    const sunlightSynonyms = {
        full_sun: ['full sun', 'sun', 'full sun partial sun', 'Full sun only if soil kept moist'],
        partial_shade: ['part sun/part shade', 'part shade', 'partial shade', 'partial sun shade'],
        full_shade: ['shade', 'full shade', 'deep shade'],
        filtered_shade: ['filtered shade'],
        deciduous_shade: ['Deciduous Shade (Spring Sun)']
    }
    if (sunlight){
        const variants = sunlightSynonyms[sunlight] || [sunlight];
        conditions.push(`sunlight && $${paramIndex}::text[]`);
        values.push(variants);
        paramIndex++;
    }

    if (watering){
        conditions.push(`$${paramIndex} = ANY(watering)`);
        values.push(watering);
        paramIndex++;
    }

    if (soiltype){
        conditions.push(`$${paramIndex} = ANY(soiltype)`);
        values.push(soiltype);
        paramIndex++;
    }

    if (cycletype){
        conditions.push(`$${paramIndex} = ANY(cycletype)`);
        values.push(cycletype);
        paramIndex++;
    }

    if (hardinesszone){
        conditions.push(`hardinesszonelower <= $${paramIndex} AND hardinesszoneupper >= $${paramIndex}`);
        values.push(parseInt(hardinesszone));
        paramIndex++;
    }

    if (droughts == 'true' || droughts == 'false'){
        conditions.push(`droughts = $${paramIndex}`);
        values.push(droughts === 'true');
        paramIndex++;
    }

    if (fruits == 'true' || fruits == 'false'){
        conditions.push(`fruits = $${paramIndex}`);
        values.push(fruits === 'true');
        paramIndex++;
    }

    if (flowers == 'true' || flowers == 'false'){
        conditions.push(`flowers = $${paramIndex}`);
        values.push(flowers === 'true');
        paramIndex++;
    }

    let query = 'SELECT * FROM plants';
    if (conditions.length > 0){
        query += ' WHERE ' + conditions.join(' AND ');
    }
    console.log('Built query:', query, values);

    try{
        const result = await pool.query(query, values);
        res.json(result.rows);
    } catch (err){
        console.error('Query error: ', err.message);
        res.status(500).json({ error: 'Encountered an error while processesing request.'});
    }
});

// Allow users to find hardiness zone based off zipcode.
// Calls API from phzmapi 
app.get('/api/hardinesszone', async (req, res) => {
    const { zip } = req.query;

    if(!zip){
        return res.status(400).json({ error: 'Please provide a zip code to determine your hardiness zone.'});
    }

    try{
        const response = await fetch(`https://phzmapi.org/${zip}.json`);

        if(!response.ok){
            return res.status(404).json({ error: 'Zipcode not found in database.'});
        }

        //This API returns specific zone info such as 6B or 4A, Perenual API only uses number portion of zone
        const data = await response.json();
        const zoneNumber = parseInt(data.zone);

        res.json({ zone: zoneNumber, rawZone: data.zone});
    } catch (err){
        console.error('Hardiness zone lookup error: ', err.message);
        res.status(500).json({ error: 'Encountered an error while processing request.'});
    }
});

// When plant selected, provide detail for that plant
app.get('/api/plants/:id', async (req, res) => {
    const { id } = req.params;
    try{
        const result = await pool.query('SELECT * FROM plants WHERE plantid = $1', [id]);
        if(result.rows.length === 0){
            return res.status(404).json({ error: 'Plant not found in database.'});
        }
        res.json(result.rows[0]);
    } catch (err){
        console.error('Had an error while fetching plant details: ', err.message);
        res.status(500).json({ error: 'Encountered an error while processing request.'});
    }
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));

