require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db.js') //Points to Supabase after updating .env 

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/plants/search', async (req, res) => {
    const { sunamount, wateramount, soiltype, hardinesszone, drought, fruit, flower, indoor, 
        poisonoustohumans, poisonoustopets } = req.query;

    let conditions = [];
    let values = [];
    let paramIndex = 1;

    if (sunamount){
        conditions.push(`$${paramIndex} = ANY(sunamount)`);
        values.push(sunamount);
        paramIndex++;
    }

    if (wateramount){
        conditions.push(`$${paramIndex} = ANY(wateramount)`);
        values.push(wateramount);
        paramIndex++;
    }

    if (soiltype){
        conditions.push(`$${paramIndex} = ANY(soiltype)`);
        values.push(soiltype);
        paramIndex++;
    }

    if (hardinesszone){
        conditions.push(`hardinesszonelower <= $${paramIndex} AND hardinesszoneupper >= $${paramIndex}`);
        values.push(parseInt(hardinesszone));
        paramIndex++;
    }

    if (drought == 'true' || drought == 'false'){
        conditions.push(`drought = $${paramIndex}`);
        values.push(drought === 'true');
        paramIndex++;
    }

    if (fruit == 'true' || fruit == 'false'){
        conditions.push(`fruit = $${paramIndex}`);
        values.push(fruit === 'true');
        paramIndex++;
    }

    if (flower == 'true' || flower == 'false'){
        conditions.push(`flower = $${paramIndex}`);
        values.push(flower === 'true');
        paramIndex++;
    }

    if (indoor == 'true' || indoor == 'false'){
        conditions.push(`indoor = $${paramIndex}`);
        values.push(indoor === 'true');
        paramIndex++;
    }

    if (poisonoustohumans == 'true' || poisonoustohumans == 'false'){
        conditions.push(`poisonoustohumans = $${paramIndex}`);
        values.push(poisonoustohumans === 'true');
        paramIndex++;
    }

    if (poisonoustopets == 'true' || poisonoustopets == 'false'){
        conditions.push(`poisonoustopets = $${paramIndex}`);
        values.push(poisonoustopets === 'true');
        paramIndex++;
    }

    let query = 'SELECT * FROM plants';
    if (conditions.length > 0){
        query += ' WHERE ' + conditions.join(' AND');
    }

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));

