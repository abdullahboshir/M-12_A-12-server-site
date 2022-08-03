const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middle ware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqatnhq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT (req, res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
       return res.status(401).send({message: 'UnAuthorized access'});
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded) {
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
        }
       req.decoded = decoded;
       next()
      });
      
}


async function run() {
    try {

        const productServiceCollection = client.db('parts_zone').collection('products');
        const userProfileCollection = client.db('parts_zone').collection('profile');
        const userReviewsCollection = client.db('parts_zone').collection('reviews');
        const userOrderInformation = client.db('parts_zone').collection('orderInformation');
        const userCollection = client.db('parts_zone').collection('users');



        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requitester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({email: requitester})
           if(requesterAccount.role === 'admin'){
            const filter = { email: email };
            const updateDoc = {
                $set: {role: 'admin'}
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send( result )
           }
           else{
            res.status(403).send({message: 'Forbidden'})
           }
        });

app.get('/admin/:email', async(req, res) => {
    const email = req.params.email;
    const user = await userCollection.findOne({email: email});
    const isAdmin = user?.role === 'admin';
    res.send({Admin : isAdmin})
    console.log(email)
})

        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ result, token })
        })

        app.get('/users', verifyJWT, async(req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })


        // get parts 
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productServiceCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });


        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const update = await productServiceCollection.findOne(query);
            res.send(update)

        });



        app.post('/profile', async (req, res) => {
            const updateUser = req.body;
            const setUpdate = await userProfileCollection.insertOne(updateUser);
            res.send(setUpdate)
        })

        app.get('/profile', async (req, res) => {
            const query = {};
            const curesor = await userProfileCollection.find(query).toArray();
            res.send(curesor)
        });



        app.get('/profile/:profileUser', async (req, res) => {
            const email = req.params.profileUser;
            const query = { profileUser: (email) }
            const update = await userProfileCollection.findOne(query);
            res.send(update)
        })


        // app.put('/profile/:profileUser', async (req, res) => {
        //     const email = req.params.profileUser;
        //     const updatedUser = req.body;
        //     const filter = { profileUser: (email) };
        //     const options = { upsert: true };
        //     const updatedDoc = {
        //         $set: {
        //             updateEducation: updatedUser.updateEducation,
        //             updateLocation: updatedUser.updateLocation,
        //             socialLink: updatedUser.socialLink,
        //             UpdateUrl: updatedUser.UpdateUrl,
        //             profileUser: updatedUser.profileUser
        //         }
        //     };
        //     const result = await userProfileCollection.updateOne(filter, updatedDoc, options);
        //     res.send(result)
        // });


        // post and get Customer reviews 

        app.get('/reviews', async (req, res) => {
            const cursor = await userReviewsCollection.find().toArray();
            res.send(cursor)
        })

        app.post('/reviews', async (req, res) => {
            const query = req.body;
            const setPost = await userReviewsCollection.insertOne(query);
            res.send(setPost)
        });



        // Post, get and delete User order information 
        app.post('/userOrderData', async (req, res) => {
            const order = req.body;
            const orderData = await userOrderInformation.insertOne(order);
            res.send(orderData)
        });


        // app.get('/userOrderData', verifyJWT, async (req, res) => {
        //     const cutomerEmail = req.query.cutomerEmail; 
        //     const decodedEmail = req.decoded?.email;
        //     console.log('error', decodedEmail, order)
        //     const query = {cutomerEmail: cutomerEmail};
        //     const loadOrderData = await userOrderInformation.find(query).toArray();
        //     res.send(loadOrderData)
        // });


        app.get('/userOrderData', verifyJWT, async (req, res) => {
            const cutomerEmail = req.query.cutomerEmail; 
                const decodedEmail = req.decoded?.email;
                // console.log('error', decodedEmail, cutomerEmail)
            const query = {};
            const loadOrderData = await userOrderInformation.find(query).toArray();
            res.send(loadOrderData)
        });




        app.delete('/userOrderData/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userOrderInformation.deleteOne(query);
            res.send(result)
        })

    }

    finally {

    }
}


run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Connected Pars-Zone')
});

app.listen(port, (req, res) => {
    console.log('Listen to Port', port);
})