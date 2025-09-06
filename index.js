require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
const app = express()
const port = 3000;
const { GoogleGenerativeAI } = require('@google/generative-ai');


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
// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const db = client.db('studysphereDB');
const userCollection = db.collection('users');
const subjectCollection = db.collection("subjects");
const scheduleCollection = db.collection('schedules');
const quizProgressCollection = db.collection('quizProgress');
const studyPlannerCollection = db.collection('studyPlanner');
const walletCollection = db.collection("wallet");
const postCollection = db.collection('posts');



async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // user apis
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

        // upload cover api
        app.patch('/upload-cover', async (req, res) => {
            const { email } = req.query;
            const { coverUrl } = req.body;
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!coverUrl) return res.status(400).json({ message: "cover url not found" });
            console.log(email, coverUrl);
            try {
                const result = await userCollection.updateOne(
                    { email: email },
                    {
                        $set: {
                            coverURL: coverUrl
                        }
                    },
                    { upsert: true }
                );
                console.log(result);
                if (result.modifiedCount > 0) {
                    return res.status(201).json(result);
                }
                res.status(400).json({ message: "cover update failed" });
            }
            catch (err) {
                console.error('error updating cover image', err);
                res.status(500).json({ message: "internal server error updating cover image" });
            }
        });

        // get cover photo
        app.get('/cover-photo', async (req, res) => {
            const { email } = req.query;
            if (!email) return res.status(400).json({ message: "user email not found" });
            try {
                const user = await userCollection.findOne({ email: email });
                if (user) {
                    const coverUrl = user?.coverURL || ''
                    return res.status(200).json(coverUrl)
                } else {
                    res.status(404).json({ message: "user with this email not found" });
                }
            }
            catch (err) {
                console.error('error getting cover image', err);
                res.status(500).json({ message: "internal server error while getting user cover url" });
            }
        })




        // post apis

        // create new post
        app.post('/create-post', async (req, res) => {
            const { email } = req.query;
            const { postData } = req.body;
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!postData) return res.status(400).json({ message: "post data not found" });

            console.log(postData);

            try {
                const result = await postCollection.insertOne(postData);
                console.log(result);
                if (!result.insertedId) return res.status(400).json({ message: "post upload failed" });
                else res.status(201).json(result);
            }
            catch (err) {
                console.error("error uploading new post", err);
                res.status(500).json({ message: "internal server error uploading new post" });
            }

        });

        // get post api
        app.get('/my-posts', async (req, res) => {
            const { email, page = 1, limit = 10 } = req.query;
            if (!email) return res.status(400).json({ message: "user email not found" });

            const pageNum = parseInt(page, 10);
            const limitNum = parseInt(limit, 10);

            try {
                const posts = await postCollection
                    .find({ "author.email": email })
                    .sort({ createdAt: -1 }) // newest first
                    .skip((pageNum - 1) * limitNum)
                    .limit(limitNum)
                    .toArray();

                if (!posts) return res.status(404).json({ message: "no post found in this account" });

                const total = await postCollection.countDocuments({ "author.email": email });

                res.status(200).json({
                    posts,
                    total,
                    page: pageNum,
                    totalPages: Math.ceil(total / limitNum)
                });
            } catch (err) {
                console.error("error getting user posts", err);
                res.status(500).json({ message: "internal server error while getting user posts" });
            }
        });

        // update existing post
        app.patch('/update-post', async (req, res) => {
            const { email } = req.query;
            const { data } = req.body;
            if (!email) return res.status(400).json({ message: 'user email not found' });
            if (!data) return res.status(400).json({ message: 'updated data not found' });
            try {
                const { id, newImage, newText } = data;
                if (!id) return res.status(400).json({ message: "post id not found" });

                let update = { $set: {} };
                if (newImage) {
                    update.$set.image = newImage;
                }
                if (newText) {
                    update.$set.text = newText;
                }

                if (Object.keys(update.$set).length === 0) {
                    return res.status(400).json({ message: 'no fields to update' });
                }

                const result = await postCollection.updateOne(
                    { _id: new ObjectId(id), 'author.email': email },
                    update
                );
                console.log(result);

                if (result.modifiedCount < 1) {
                    return res.status(404).json({ message: "post not found or update failed" });
                }
                res.status(201).json(result);
            }
            catch (err) {
                console.error('error updating post', err);
                res.status(500).json({ message: "internal server error updating post" });
            }
        });

        // delete post 
        app.delete('/delete-post', async (req, res) => {
            const { id, email } = req.query;
            if (!id) return res.status(400).json({ message: "post id not found" });
            if (!email) return res.status(400).json({ message: "user email not found" });
            try {
                const result = await postCollection.deleteOne(
                    { _id: new ObjectId(id), 'author.email': email }
                );
                if (result.deletedCount < 1) {
                    return res.status(400).json({ message: "post delete failed. try again" });
                }
                res.status(204).json(result);
            }
            catch (err) {
                console.error("error deleting post", err);
                res.status(500).json({ message: "internal server error deleting post" });
            }
        })











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

                /**
                 * checking if the user has already a schedule or not
                 * if they have, then update (add) new schedules
                 */
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
                /**
                 * if the user doesn't have any schedule then
                 * create a new one
                 */
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

        });

        // get all schedules of specific user
        app.get('/my-schedules', async (req, res) => {
            const { email } = req.query;
            if (!email) {
                return res.status(404).json({ message: "user email not found" });
            }
            // console.log(email);

            try {
                const scheduleObject = await scheduleCollection.findOne({ email: email })

                if (!scheduleObject) {
                    return res.status(404).json({ message: "schedule not found" });
                }
                else {
                    const schedules = scheduleObject?.schedules;
                    // console.log(schedules);
                    res.status(200).json(schedules)
                }

            }
            catch (err) {
                console.error("error getting schedules", err);
                res.status(500).json({ message: "internal server error getting schedules" });
            }

        });

        // delete specific schedule
        app.delete('/delete-schedule', async (req, res) => {
            const { email } = req.query;
            const scheduleData = req.body;
            if (!email) {
                return res.status(404).json({ message: "user email not found" });
            }
            if (!scheduleData) {
                return res.status(404).json({ message: "schedule data not found" });
            }
            console.log(email, scheduleData);
            try {
                const result = await scheduleCollection.updateOne(
                    { email: email },
                    {
                        $pull: {
                            schedules: {
                                day: scheduleData.day,
                                subjectName: scheduleData.subjectName,
                                teacherName: scheduleData.teacherName,
                                time: scheduleData.time
                            }
                        }
                    }
                );
                console.log(result);
                if (result.modifiedCount < 1) {
                    return res.status(400).json({ message: "removing schedule failed" });
                }
                res.status(201).json(result);
            }
            catch (err) {
                console.error("error removing schedule", err);
                res.status(500).json({ message: "internal server error removing schedule data" });
            }
        });






        // generate questions
        app.post("/question-generator", async (req, res) => {
            const { email } = req.query;
            const { data: questionData } = req.body;

            if (!email) return res.status(404).json({ message: "User email not found" });
            if (!questionData) return res.status(404).json({ message: "Question data not found" });

            try {
                const { questionType, topic, questionNumbers, difficulty } = questionData;

                if (!["quiz", "true-false", "short-answer"].includes(questionType)) {
                    return res.status(400).json({ message: "Invalid question type" });
                }

                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                let prompt = "";

                if (questionType === "quiz") {
                    prompt = `Generate ${questionNumbers} multiple choice questions on "${topic}" for ${difficulty} level.
                        Provide 4 options for each question and indicate the correct answer in this format:

                        Question: <question text>
                        Options: A) ... B) ... C) ... D) ...
                        Answer: <correct option>

                        Only return the questions in this format, nothing else.`;
                }
                else if (questionType === "true-false") {
                    prompt = `Generate ${questionNumbers} true/false questions on "${topic}" for ${difficulty} level.
                    Format:

                    Question: <question text>
                    Answer: True/False

                    Only return the questions in this format, nothing else.`;
                } else if (questionType === "short-answer") {
                    prompt = `Generate ${questionNumbers} short-answer questions on "${topic}" for ${difficulty} level.
                    Format:

                    Question: <question text>
                    Answer: <short answer>

                    Only return the questions in this format, nothing else.`;
                }

                const result = await model.generateContent({
                    contents: [
                        { role: "user", parts: [{ text: prompt }] }
                    ]
                });

                const responseText = result.response.text();

                return res.json({
                    email,
                    questionType,
                    raw: responseText
                });

            } catch (error) {
                console.error("Error generating questions:", error);
                return res.status(500).json({ message: "Error generating questions", error });
            }
        });


        // verify answers
        app.post("/verify-answers", async (req, res) => {
            const { email } = req.query;
            const { data: answersData } = req.body;

            if (!email) return res.status(404).json({ message: "User email not found" });
            if (!answersData) return res.status(404).json({ message: "Answer data not found" });

            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                // Prepare verification prompt
                const prompt = answersData.map(a =>
                    `Question: ${a.question}\nUserAnswer: ${a.userAnswer}\nRespond with CorrectAnswer and IsCorrect (true/false) like this format:
            CorrectAnswer: <correct answer>
            IsCorrect: <true/false>`
                ).join("\n\n");

                const result = await model.generateContent({
                    contents: [{ role: "user", parts: [{ text: prompt }] }]
                });

                const aiRawText = result.response.text();
                console.log("AI Raw Response:", aiRawText);

                // Split responses by double newlines
                const aiResponses = aiRawText.split("\n\n").filter(Boolean);

                const verifiedResults = answersData.map((q, i) => {
                    const resp = aiResponses[i] || "";
                    const correctAnswerMatch = resp.match(/CorrectAnswer:\s*(.*)/i);
                    const isCorrectMatch = resp.match(/IsCorrect:\s*(true|false)/i);

                    return {
                        question: q.question,
                        userAnswer: q.userAnswer,
                        correctAnswer: correctAnswerMatch ? correctAnswerMatch[1].trim() : null,
                        isCorrect: isCorrectMatch ? isCorrectMatch[1].toLowerCase() === "true" : false
                    };
                });

                return res.json({ results: verifiedResults });

            } catch (error) {
                console.error("Error verifying answers:", error);
                return res.status(500).json({ message: "Error verifying answers", error });
            }
        });


        // quiz progress

        // save progress
        app.post("/save-quiz-progress", async (req, res) => {
            const { email } = req.query;
            const { quizType, topic, difficulty, questions } = req.body;

            if (!email) {
                return res.status(404).json({ message: "user email not found" });
            }
            if (!quizType || !topic || !difficulty || !questions) {
                return res.status(404).json({ message: "quiz details missing. try again" });
            }

            try {
                const solved = questions.length;
                const correct = questions.filter(q => q.isCorrect).length;

                const update = {
                    $inc: {
                        totalQuestionSolved: solved,
                        totalCorrectAnswers: correct,
                        [`byDifficulty.${difficulty}.solved`]: solved,
                        [`byDifficulty.${difficulty}.correct`]: correct, // ✅ fixed
                    },
                    $push: {
                        quizzes: {
                            quizType,
                            topic,
                            difficulty,
                            questions,
                            submittedAt: new Date().toISOString(),
                        },
                    },
                    $setOnInsert: {
                        userEmail: email,
                        createdAt: new Date().toISOString(),
                    },
                };

                const result = await quizProgressCollection.updateOne(
                    { userEmail: email },
                    update,
                    { upsert: true }
                );

                console.log("result from save progress", result);

                // ✅ Proper success check
                if (result.upsertedId || result.modifiedCount > 0) {
                    return res
                        .status(201)
                        .json({ message: "quiz progress data saved successfully" });
                }

                return res
                    .status(400)
                    .json({ message: "no changes were made to quiz progression data" });
            } catch (err) {
                console.error("error saving quiz progress", err);
                res
                    .status(500)
                    .json({ message: "internal server error saving quiz progress" });
            }
        });

        // get user quiz progression data
        app.get('/my-quiz-progression', async (req, res) => {
            const { email } = req.query;
            if (!email) {
                return res.status(400).json({ message: "user email not found" });
            }

            try {
                const progression = await quizProgressCollection.findOne({ userEmail: email });
                if (!progression) {
                    return res.status(404).json({ message: "no quiz data found in the database" });
                }
                res.status(200).json(progression)
            }
            catch (err) {
                console.error("error getting quiz progression data", err);
                res.status(500).json({ message: "internal server error getting quiz progress data" });
            }

        });



        // study planner api

        // add a new plan
        app.post('/study-plans', async (req, res) => {
            const { email } = req.query;
            const plan = req.body;
            console.log(plan);
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!plan) return res.status(400).json({ message: "plan data not found" });

            try {
                const finalPlan = {
                    userEmail: email,
                    ...plan,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
                const result = await studyPlannerCollection.insertOne(finalPlan);
                if (result.insertedId) {
                    return res.status(201).json(result);
                } else {
                    res.status(400).json({ message: "failed to add new study plan" });
                }
            }
            catch (err) {
                console.error('error adding new study plan', err);
                res.status(500).json({ message: "internal server error adding new study plan" });
            }

        });

        // get study plans
        app.get('/study-plans', async (req, res) => {
            const { email } = req.query;
            if (!email) return res.status(400).json({ message: "user email not found" });

            try {
                const plans = await studyPlannerCollection.find({ userEmail: email }).toArray();

                if (plans) {
                    return res.status(200).json(plans)
                } else {
                    res.status(404).json({ message: "no plans found with this email" })
                }
            }
            catch (err) {
                console.error("error getting study plan data", err);
                res.status(500).json({ message: "internal server error getting study plan data" });
            }

        });

        // update plan
        app.put('/study-plans/:id', async (req, res) => {
            const { email } = req.query;
            const { id } = req.params;
            const update = req.body;
            console.log(update);
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!id) return res.status(400).json({ message: "plan id not found" });
            if (!update) return res.status(400).json({ message: "updated doc not found" });

            try {
                const result = await studyPlannerCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { ...update, updatedAt: new Date().toISOString() } }
                );
                console.log(result);
                if (result.modifiedCount > 0) {
                    return res.status(201).json(result);
                }
                else {
                    res.status(400).json({ message: "failed to update study plan" })
                }
            }
            catch (err) {
                console.error("error updating study plan", err);
                res.status(500).json({ message: "internal server error updating study plan" });
            }

        })

        // delete study plan
        app.delete('/study-plans/:id', async (req, res) => {
            const { email } = req.query;
            const { id } = req.params;
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!id) return res.status(400).json({ message: "plan id not found" });

            try {
                const result = await studyPlannerCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    return res.status(201).json(result);
                }
                else {
                    res.status(400).json({ message: "failed to delete study plan" });
                }
            }
            catch (err) {
                console.error('error deleting study plan', err);
                res.status(500).json({ message: "internal server error deleting study plan" });
            }

        })




        // wallet apis

        // add income
        app.post("/wallet/income", async (req, res) => {
            const { email } = req.query;
            const walletData = req.body;
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!walletData) return res.status(400).json({ message: "wallet income data not found" });
            // console.log(email, walletData);
            try {
                const { amount, source, date } = walletData;
                const result = await walletCollection.updateOne(
                    { email: email },
                    {
                        $inc: { totalAmount: amount },
                        $push: {
                            income: { amount, source, date }
                        }
                    },
                    { upsert: true }
                );
                console.log("result from add income", result);
                if (result.modifiedCount > 0 || result.upsertedCount > 0) {
                    return res.status(201).json(result);
                }
                else {
                    res.status(400).json({ message: "income add failed" });
                }

            }
            catch (err) {
                console.error("error adding income", err);
                res.status(500).json({ message: "internal server error adding income" });
            }
        });

        // get wallet data
        app.get('/wallet', async (req, res) => {
            const { email } = req.query;
            if (!email) return res.status(400).json({ message: "user email not found" });

            try {
                const result = await walletCollection.findOne({ email: email });
                if (!result) {
                    return res.status(404).json({ message: "no wallet found with this email" });
                }
                res.status(200).json(result);
            }
            catch (err) {
                console.error("error getting wallet data", err);
                res.status(500).json({ message: "internal server error getting wallet data" });
            }

        });

        // add expenses
        app.post('/wallet/expense', async (req, res) => {
            const { email } = req.query;
            const expenseData = req.body;
            if (!email) return res.status(400).json({ message: "user email not found" });
            if (!expenseData) return res.status(400).json({ message: "expense data not found" });

            // console.log(email, expenseData);

            try {
                const amount = Number(expenseData.amount);
                const { category, date } = expenseData;
                const result = await walletCollection.updateOne(
                    { email: email },
                    {
                        $inc: { totalAmount: -amount },
                        $push: {
                            expense: { amount, category, date }
                        }
                    }
                );
                console.log(result);
                if (result.modifiedCount < 1) {
                    return res.status(400).json({ message: "add expense failed" });
                }
                res.status(201).json(result)
            }
            catch (err) {
                console.error("error adding expense", err);
                res.status(500).json({ message: "internal server error adding expense" });
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
