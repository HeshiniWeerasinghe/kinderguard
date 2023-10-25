const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const mDbConfig = require("./lib/db");
const UserDataRoutes = require("./routes/userController");
const app = express();

app.use(cors());
app.use(express.json());

mDbConfig();

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use("/api", UserDataRoutes);

app.listen(3001, () => {
  console.log(`Server is running on port ${3001}`);
});
