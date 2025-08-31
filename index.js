require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express()
const port = 3000;

app.use(express.json());
app.use(cors());

// console.log(process.env.MONGO_URI);

const uri = 'mongodb+srv://skrabbi019_db_user:OCaDscD4P7qyl6SG@cluster0.xrkj8gk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const db = client.db('studysphereDB');
const userCollection = db.collection('users');
const subjectCollection = db.collection("subjects");
const scheduleCollection = db.collection('schedules');



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // create user
        app.post("/create-user", async (req, res) => {
            const userData = req.body;
            const { email } = userData
            if (!userData) {
                return res.status(400).json({ message: "user data not found!" });
            }
            try {
                const exitingUser = await userCollection.findOne({ email: email });
                if (exitingUser) {
                    return res.status(409).json({ message: "user with this email already exist" });
                }

                const userInfo = {
                    ...userData,
                    createdAt: new Date().toISOString()
                }

                const createNewUser = await userCollection.insertOne(userInfo);
                if (!createNewUser.insertedId) {
                    return res.status(400).json({ message: "new account creation failed" });
                } else {
                    res.status(201).json(createNewUser);
                }

            }
            catch (err) {
                console.error("error creating new user account", err);
                res.status(500).json({ message: "internal server error creating new user" });
            }
        });


        // subjects api

        // add subjects 
        app.post('/add-subjects', async (req, res) => {
            const data = req.body;
            const { email } = req.query;
            console.log(email);
            if (!data) {
                return res.status(400).json({ message: "subject data not found" });
            }
            if (!email) {
                return res.status(401).json({ message: "email required" });
            }

            try {

                // checking if any document exists with this email or not
                const existUserDoc = await subjectCollection.findOne({ userEmail: email });

                // is it doesn't exist, then create a new one
                if (!existUserDoc) {
                    const result = await subjectCollection.insertOne(data);
                    if (!result.insertedId) {
                        return res.status(400).json({ message: "failed to add subjects" })
                    } else {
                        res.status(201).json(result);
                    }
                }
                // pushing new subjects into the previously existing document
                else {
                    const subjects = data?.subjects || [];
                    const result = await subjectCollection.updateOne(
                        { userEmail: email },
                        {
                            $push: { subjects: { $each: subjects } }
                        }
                    );
                    if (result.modifiedCount === 0) {
                        return res.status(400).json({ message: "failed to update subjects" });
                    } else {
                        return res.status(201).json(result);
                    }
                }
            }
            catch (err) {
                console.error("internal server error adding subjects", err);
                res.status(500).json({ message: "internal server error adding subjects" });
            }

        });

        // get user specific subjects
        app.get('/my-subjects', async (req, res) => {
            const { email } = req.query;
            // console.log(email);
            if (!email) {
                return res.status(400).json({ message: "user email missing" });
            };

            try {
                const filter = { userEmail: email };
                // console.log('filter', filter);

                const subjectData = await subjectCollection.findOne(filter);
                // console.log('subject data', subjectData);


                if (!subjectData) {
                    return res.status(404).json({ message: "no subjects added yet." });
                } else {
                    const subjects = subjectData?.subjects;
                    const total = subjects.length
                    const data = {
                        subjects,
                        total
                    };
                    // console.log(data);
                    res.status(200).json(data);
                }
            }
            catch (err) {
                console.error('internal server error getting subjects data', err);
                res.status(500).json({ message: "internal server error getting subject data" });
            }

        });

        // delete subject
        app.delete('/delete-subject', async (req, res) => {
            const { email } = req.query;
            const subject = req.body;
            if (!email) {
                return res.status(400).json({ message: "user email not found" });
            }
            if (!subject) {
                return res.status(400).json({ message: "subject data not found" });
            }

            try {
                const result = await subjectCollection.updateOne(
                    { userEmail: email },
                    {
                        $pull: {
                            subjects: {
                                subjectName: subject?.subjectName,
                                teacherName: subject?.teacherName,
                                teacherNumber: subject?.teacherNumber
                            }
                        }
                    }
                );

                if (result.modifiedCount < 1) {
                    return res.status(404).json({ message: "subject not found or already deleted" });
                }

                res.status(201).json(result);

            }
            catch (err) {
                console.error("error deleting subject", err);
                res.status(500).json({ message: "internal server error deleting subject" });
            }

        });

        // update subject
        app.patch('/update-subject', async (req, res) => {
            const { email } = req.query;
            const data = req.body;
            if (!email) {
                return res.status(404).json({ message: "user email not found" });
            };
            if (!data) {
                return res.status(404).json({ message: "subject data not found" });
            }
            console.log(email, data);
            const oldData = data?.data?.oldData;
            const newData = data?.data?.newData;
            console.log(oldData, newData);
            if (!oldData) {
                return res.status(404).json({ message: "subject old data not found" });
            }
            if (!newData) {
                return res.status(404).json({ message: "subject new data not found" });
            }

            try {
                const filter = { userEmail: email }

                const removeOldData = await subjectCollection.updateOne(
                    filter,
                    {
                        $pull: {
                            subjects: {
                                subjectName: oldData?.subjectName,
                                teacherName: oldData?.teacherName,
                                teacherNumber: oldData?.teacherNumber
                            }
                        }
                    }
                );

                if (removeOldData.modifiedCount > 0) {
                    const addNewData = await subjectCollection.updateOne(
                        filter,
                        {
                            $push: {
                                subjects: {
                                    subjectName: newData?.subjectName,
                                    teacherName: newData?.teacherName,
                                    teacherNumber: newData?.teacherNumber
                                }
                            }
                        }
                    );

                    if (addNewData.modifiedCount < 1) {
                        return res.status(400).json({ message: "subject update failed" });
                    }
                    else {
                        res.status(201).json(addNewData);
                    }

                }

            }
            catch (err) {
                console.error("error updating subject details", err);
                res.status(500).json({ message: "internal server error updating subject data" });
            }
        });




        // schedule apis

        // add schedule
        app.post('/add-schedule', async (req, res) => {
            const { email } = req.query;
            const scheduleDetails = req.body;
            if (!email) {
                return res.status(404).json({ message: "user email not found" });
            };
            if (!scheduleDetails) {
                return res.status(404).json({ message: "schedule details not found" });
            };

            console.log(email, scheduleDetails.data);
            try {
                const schedules = scheduleDetails.data
                const existingSchedule = await scheduleCollection.findOne({ email: email });
                console.log('existing schedule', existingSchedule);
                if (existingSchedule) {
                    const result = await scheduleCollection.updateOne(
                        { email: email },
                        {
                            $push: {
                                schedules: { $each: schedules }
                            }
                        }
                    );
                    console.log('result from existing schedule', result);
                    if (result.modifiedCount < 1) {
                        return res.status(400).json({ message: "schedule update failed" });
                    } else {
                        res.status(201).json(result);
                    }
                }
                else {
                    const data = {
                        email: email,
                        schedules: [
                            ...schedules
                        ]
                    }
                    // console.log(data);
                    const result = await scheduleCollection.insertOne(data);
                    console.log(result);
                    if (!result.insertedId) {
                        return res.status(400).json({ message: "schedule add failed" });
                    }
                    res.status(201).json(result);
                }
            }
            catch (err) {
                console.error("error adding schedules", err);
                res.status(500).json({ message: "internal server error adding schedules" });
            }

        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
