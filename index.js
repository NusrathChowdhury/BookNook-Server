
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

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

// middleware to verify token
const JWKS = createRemoteJWKSet(
  new URL("http://localhost:3000/api/auth/jwks")
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload;
    console.log(payload);
    next();
  } catch (err) {
    return res.status(401).send({ message: "Invalid Token" });
  }
};

// Get add-books from mongodb database
app.get("/add-book", async (req, res) => {
  const results = await booksCollection.find({}).toArray();
  res.json(results);
});

// Add a new book to MongoDB database
app.post("/books", verifyToken, async (req, res) => {
  const data = req.body;
  const db = mongoClient.db("book-library");
  const booksCollection = db.collection("book");
  const result = await booksCollection.insertOne(data);
  res.json(result);
});

// Borrowed books
app.post("/borrows", verifyToken, async (req, res) => {
  const data = req.body;

  // Check if the user already borrowed this book
  const existingBook = await borrowedBooksCollection.findOne({
    bookId: data.bookId,
    userEmail: data.userEmail,
    status: "borrowed",
  });

  if (existingBook) {
    return res.status(400).json({
      message: "You have already borrowed this book",
    });
  }

  // Decrease available copies by 1
  const book = await booksCollection.updateOne(
    { _id: new ObjectId(data.bookId), totalCopies: { $gt: 0 } },
    { $inc: { totalCopies: -1 } }
  );

  if (book.modifiedCount === 0) {
    return res.status(400).json({
      message: "This book is not available",
    });
  }

  // Save borrowed book
  const result = await borrowedBooksCollection.insertOne(data);
  res.json(result);
});

// Get borrowed books by logged-in user email
app.get("/borrows", verifyToken, async (req, res) => {
  const email = req.user.email;
  const results = await borrowedBooksCollection.find({ userEmail: email }).toArray();
  res.json(results);
});

// Delete borrowed books by id
app.delete("/borrows/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  const borrowedBook = await borrowedBooksCollection.findOne({
    _id: new ObjectId(id),
  });

  const results = await borrowedBooksCollection.deleteOne({
    _id: new ObjectId(id),
  });

  if (results.deletedCount > 0 && borrowedBook) {
    await booksCollection.updateOne(
      { _id: new ObjectId(borrowedBook.bookId) },
      { $inc: { totalCopies: 1 } }
    );
  }

  res.json(results);
});

// Get all books
app.get("/books", async (req, res) => {
  const results = await booksCollection.find({}).toArray();
  res.json(results);
});

// Get book details
app.get("/books/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const results = await booksCollection.findOne({ _id: new ObjectId(id) });
  res.send(results);
});

// Get books added by a specific user
app.get("/my-books/:email", verifyToken, async (req, res) => {
  const email = req.params.email;

  const results = await booksCollection.find({ userEmail: email }).toArray();

  res.json(results);
});

// Update a book
app.patch("/books/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const data = req.body;

  const result = await booksCollection.updateOne(
    { _id: new ObjectId(id), userEmail: req.user.email },
    {
      $set: {
        title: data.title,
        author: data.author,
        category: data.category,
        image: data.image,
        description: data.description,
        totalCopies: Number(data.totalCopies),
      },
    }
  );

  res.json(result);
});

// Delete a book
app.delete("/books/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const email = req.user.email;

  const result = await booksCollection.deleteOne({
    _id: new ObjectId(id),
    userEmail: email,
  });

  res.json(result);
});

// Home route
app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
