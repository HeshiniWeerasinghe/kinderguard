const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const mDbConfig = require("./lib/db");
const UserDataRoutes = require("./routes/userController");
const app = express();
const http = require("http");
const UserData = require("./model/userModel");
const SharedLocation = require("./model/sharedLocationModel");

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mDbConfig();

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

app.use("/api", UserDataRoutes);

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", (error) => {
    console.log("Client disconnected", error);
  });

  socket.on("getLocation", async (data) => {
    // console.log("Incoming ID", data.requestID);
    try {
      const now = new Date();
      const result = await SharedLocation.aggregate([
        {
          $match: {
            usersWithinRadius: data.requestID,
            locationStartTime: {
              $gte: new Date(now - 20 * 60 * 1000), // 20 min
            },
            isActive: true,
            sharedUserId: { $ne: data.requestID },
          },
        },
        {
          $project: {
            _id: 0,
            sharedId: 1,
            sharedUserId: 1,
            sharedUsername: 1,
            sharedLat: 1,
            sharedLong: 1,
            locationStartTime: 1,
          },
        },
      ]);

      socket.emit("getLocation", result);
    } catch (error) {
      console.error("An error occurred:", error);
      socket.emit("returnMessage", {
        status: "error",
        message: "An error occurred",
      });
    }
  });

  socket.on("sendLocation", async (data) => {
    // console.log("Incoming data", data);
    const sendLocation = {
      message: "Data update successfully",
    };
    const { userId, userUsername, userLat, userLong } = data;

    try {
      const existingData = await UserData.findOne({ userId });

      if (!existingData) {
        socket.emit("sendLocation", {
          status: "error",
          message: "No user found",
          errorType: "userNotFound",
        });
        return;
      }

      if (
        userLat === null ||
        userLat === undefined ||
        userLong === null ||
        userLong === undefined ||
        userLat.trim() === "" ||
        userLong.trim() === ""
      ) {
        socket.emit("sendLocation", {
          status: "error",
          message: "userLat and userLong must not be null or undefined",
          errorType: "invalidCoordinates",
        });
        return;
      }

      existingData.userUsername = userUsername;
      existingData.userLat = userLat;
      existingData.userLong = userLong;
      await existingData.save();
      socket.emit("sendLocation", sendLocation);
    } catch (error) {
      console.error("An error occurred:", error);
      socket.emit("sendLocation", {
        status: "error",
        message: "An error occurred while updating data",
        errorType: "updateError",
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on portt ${port}`);
});
