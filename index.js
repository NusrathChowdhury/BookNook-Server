import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import "dotenv/config";

const PORT = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URL);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
    throw err;
  }
}

const mongoClient = await connectToMongoDB();

const db = mongoClient.db("book-library");
const booksCollection = db.collection("book");

//http://localhost:5000/add-book
// Get all books
app.get("/add-book", async (req, res) => {
  const results = await booksCollection.find({}).toArray();
  res.json(results);
});


app.post("/add-book", async (req, res) => {
  const data = req.body;
  const db = mongoClient.db("book-library");
  const booksCollection = db.collection("book");
  const result = await booksCollection.insertOne(data);
  res.json(result);
});




// Home route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});