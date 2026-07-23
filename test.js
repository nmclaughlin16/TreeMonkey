require('dotenv').config();

async function test() {
    const response = await fetch('https://perenual.com/api/v2/species-list?key=sk-Jdul6a56fdef2f8f218765&page=10');
    const data = await response.json();
    console.log(JSON.stringify(data, null, 1));
    // console.log('Key being sent: ', process.env.PERENUAL_KEY);
}

test();
