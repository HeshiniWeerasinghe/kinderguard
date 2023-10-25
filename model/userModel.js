const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unque: true },
  userLat: { type: String, required: true },
  userLong: { type: String, required: true },
});

const collection = new mongoose.model("user", userSchema);
module.exports = collection;
