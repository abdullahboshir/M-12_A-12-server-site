const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middle ware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqatnhq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
 try{

    const productServiceCollection = client.db('parts_zone').collection('products');

    const userProfileCollection = client.db('parts_zone').collection('profile');

    const userReviewsCollection = client.db('parts_zone').collection('reviews');

    console.log(productServiceCollection)

    // get parts 
    app.get('/products', async(req, res) => {
        const query = {};
        const cursor = productServiceCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
    });


    app.get('/products/:id', async(req, res) => {
        const id = req.params.id;
        const query = {_id: ObjectId(id)}
        const update = await productServiceCollection.findOne(query);
        res.send(update)

    });


    app.post('/profile', async(req, res) => {
       const updateUser = req.body;
       const setUpdate = await userProfileCollection.insertOne(updateUser);
       res.send(setUpdate)
    })  

    app.get('/profile', async(req, res) => {
        const query = {};
        const curesor = await userProfileCollection.find(query).toArray();
        res.send(curesor)
    });

 }
 finally{

}
}


run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Connected Pars-Zone')
});

app.listen(port, (req, res) => {
    console.log('Listen to Port', port);
})