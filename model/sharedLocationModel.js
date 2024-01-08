const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  sharedId: { type: String, required: true, unque: true },
  sharedUserId: { type: String, required: true, unque: true },
  sharedUsername: { type: String, required: true, unque: true },
  sharedLat: { type: String, required: true },
  sharedLong: { type: String, required: true },
  locationStartTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  isActive: { type: Boolean, required: true, default: true },
  usersWithinRadius: { type: Array },
});

const collection = new mongoose.model("sharedLocation", locationSchema);
module.exports = collection;
