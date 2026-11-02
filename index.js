import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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

const borrowedBooksCollection = db.collection("borrowed-books");

//http://localhost:5000/add-book
// Get add-books from mongodb database
app.get("/add-book", async (req, res) => {
  const results = await booksCollection.find({}).toArray();
  res.json(results);
});

// Add a new book to MongoDB database

app.post("/add-book", async (req, res) => {
  const data = req.body;
  const db = mongoClient.db("book-library");
  const booksCollection = db.collection("book");
  const result = await booksCollection.insertOne(data);
  res.json(result);
});

//http://localhost:5000/borrowed-books for borrowed books
app.post("/borrowed-books", async (req, res) => {
  const data = req.body;
  const result = await borrowedBooksCollection.insertOne(data);
  res.json(result);
})



//http://localhost:5000/MyBorrows
//get borrowed books by user email
app.get("/MyBorrows/:email", async (req, res) => {
  const email = req.params.email;
  const results = await borrowedBooksCollection.find({ userEmail: email }).toArray();
  res.json(results);
});

//delete borrowed books by id
app.delete("/MyBorrows/:id", async (req, res) => {
  const { id } = req.params;
  const results = await borrowedBooksCollection.deleteOne({ _id: new ObjectId(id) });
  res.json(results);
});


//get all books
//http://localhost:5000/books
app.get("/books", async (req, res) => {
  const results = await booksCollection.find({}).toArray();
  res.json(results);
})

app.get("/books/:id", async (req, res) => {
  const id = req.params
  const results = await booksCollection.findOne({ _id: new ObjectId(id) });
  res.send(results);

});

// Home route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});