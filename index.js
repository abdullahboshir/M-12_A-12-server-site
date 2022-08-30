const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const port = process.env.PORT || 5000;


// middle ware 
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mqatnhq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    })
}


async function run() {
    try {

        const productServiceCollection = client.db('parts_zone').collection('products');
        const userProfileCollection = client.db('parts_zone').collection('profile');
        const userReviewsCollection = client.db('parts_zone').collection('reviews');
        const userOrderInformation = client.db('parts_zone').collection('orderInformation');
        const userCollection = client.db('parts_zone').collection('users');
        const paymentCollection = client.db('parts_zone').collection('payments');


        const verifyAdmin = async(req, res, next) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const RequesterAccount = await userCollection.findOne({email: requester});
            if(RequesterAccount.role === 'admin'){
                console.log('admin success')
                next()
            }
            else{
                return res.status(403).send({message: 'Forbidden'})
            }
        };


        app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
            const service = req.body;
            const price = service.OrderTotalPrice;
            const amount = price*100;
        
           
            if(price){
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: amount,
                    currency: "usd",
                    payment_method_types: ['card']
                  });
                  res.send({clientSecret: paymentIntent.client_secret}) 
            }
          
        });


        app.put('/users/admin/:email', verifyJWT, async (req, res) => {
            const adminRole = req.body.role;
            const email = req.params.email;
            const requitester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requitester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: adminRole }
                };
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }
        });


        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user?.role === 'admin';
            res.send({ Admin: isAdmin })
        });



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
        });


        app.get('/users', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users)
        })


        // product post get  

        app.post('/products', verifyJWT, async(req, res) => {
            const addProduct = req.body;
            console.log(addProduct)
            const add = await productServiceCollection.insertOne(addProduct);
            res.send(add)
        });

        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productServiceCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });


        app.get('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const update = await productServiceCollection.findOne(query);
            res.send(update)
        });


        app.delete('/products/:id', verifyJWT, async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const deleteItem = await productServiceCollection.deleteOne(query);
            res.send(deleteItem)
        });



        app.put('/profile/:profileUserEmail', verifyJWT, async (req, res) => {
            const userProfile = req.body;
            const profileUserEmail = req.params.profileUserEmail;
            console.log('this is body', userProfile, 'this is params', profileUserEmail)
            const filter = { profileUser: profileUserEmail };
            const options = { upsert: true };
            const updateDoc = {
                $set: userProfile
            };
            const update = await userProfileCollection.updateOne(filter, updateDoc, options);
            res.send(update)
        });


        app.get('/profile/:profileUserEmail', verifyJWT, async (req, res) => {
            const profileUserEmail = req.params.profileUserEmail;
            const userProfile = await userProfileCollection.findOne({profileUser:profileUserEmail});
            res.send(userProfile);


        })

        app.get('/reviews', async (req, res) => {
            const cursor = await userReviewsCollection.find().toArray();
            res.send(cursor)
        })

        app.post('/reviews', verifyJWT, async (req, res) => {
            const query = req.body;
            const setPost = await userReviewsCollection.insertOne(query);
            res.send(setPost)
        });



        // Post, get and delete User order information 
        app.post('/userOrderData', verifyJWT, async (req, res) => {
            const order = req.body;
            const orderData = await userOrderInformation.insertOne(order);
            res.send(orderData)
        });

        app.get('/userOrderData/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const filter = await userOrderInformation.findOne(query);
            res.send(filter)
        });


        // ekti email diye sei email er sokol element khuje pawa
        app.get('/userOrderData', verifyJWT, async (req, res) => {
            const cutomerEmail = req.query.cutomerEmail;
            const query = { cutomerEmail: cutomerEmail };
            const loadOrderData = await userOrderInformation.find(query).toArray();
            res.send(loadOrderData)
        });




        app.delete('/userOrderData/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await userOrderInformation.deleteOne(query);
            res.send(result)
        });

        app.patch('/userOrderData/:id', verifyJWT, async(req, res) =>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const payment = req.body;
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const result = await paymentCollection.insertOne(payment)
            console.log('this is updateDoc', updatedDoc, 'this is filter', filter)
            const updatedOrder = await userOrderInformation.updateOne(filter, updatedDoc);
            console.log('this is updateDoc000000000000000000000', updatedOrder)
            res.send(updatedOrder)
        });


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