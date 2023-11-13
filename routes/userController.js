const express = require("express");
const router = express.Router();
const UserData = require("../model/userModel");
const SharedLocation = require("../model/sharedLocationModel");

//Save User Data
router.post("/saveUser", async (req, res) => {
  const { userId, userUsername, userLat, userLong } = req.body;
  try {
    const existingData = await UserData.findOne({ userId });

    if (existingData) {
      return res.status(400).json({ message: "User already exists" });
    }

    const userData = new UserData({
      userId,
      userUsername,
      userLat,
      userLong,
    });

    await userData.save();

    res.status(201).json({ message: "Data saved successfully" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while saving form data" });
  }
});

//Update log&lat  shared by user (Current location)
router.patch("/updateSharedCordinates", async (req, res) => {
  const { userId, userUsername, userLat, userLong } = req.body;
  try {
    const existingData = await UserData.findOne({ userId });

    if (!existingData) {
      return res.status(400).json({ message: "No user found" });
    }
    if (
      userLat === null ||
      userLat === undefined ||
      userLong === null ||
      userLong === undefined ||
      userLat.trim() === "" ||
      userLong.trim() === ""
    ) {
      return res.status(400).json({
        message: "sharedLat and sharedLong must not be null or undefined",
      });
    }
    existingData.userUsername = userUsername;
    existingData.userLat = userLat;
    existingData.userLong = userLong;
    await existingData.save();
    res.status(201).json({ message: "Data update successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while updating data" });
  }
});

//Get all users which is within 500m according to the shared location
router.post("/getUsers", async (req, res) => {
  const { userId, userUsername, userLat, userLong } = req.body;
  try {
    const existingData = await UserData.findOne({ userId });
    const usersIdsWithinRadius = [];
    if (!existingData) {
      return res.status(400).json({ message: "No user found" });
    }

    const usersWithinRadius = await UserData.find({
      $and: [
        {
          userLat: {
            $gte: parseFloat(userLat) - 0.0045,
            $lte: parseFloat(userLat) + 0.0045,
          },
        },
        {
          userLong: {
            $gte: parseFloat(userLong) - 0.0045,
            $lte: parseFloat(userLong) + 0.0045,
          },
        },
      ],
    });

    function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
      const R = 6371000;
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;
      return distance;
    }

    const userIdsAndDistances = usersWithinRadius.map((user) => {
      const distance = calculateHaversineDistance(
        parseFloat(userLat),
        parseFloat(userLong),
        parseFloat(user.userLat),
        parseFloat(user.userLong)
      );
      usersIdsWithinRadius.push(user.userId);
      return {
        userId: user.userId,
        username: user.userUsername,
        userLat: userLat,
        userLong: userLong,
        distance: Math.round(distance),
      };
    });

    // Save data to the database
    const existingUser = await SharedLocation.findOne({ userId });
    if (!existingUser) {
      const sharedLocationData = new SharedLocation({
        sharedUserId: userId,
        sharedUsername: userUsername,
        sharedLat: userLat,
        sharedLong: userLong,
        locationStartTime: new Date(),
        usersWithinRadius: userIdsAndDistances.map((data) => data.userId),
      });
      await sharedLocationData.save();
    } else {
      await SharedLocation.findOneAndUpdate(
        { sharedUserId: userId },
        {
          sharedUsername: userUsername,
          sharedLat: userLat,
          sharedLong: userLong,
          usersWithinRadius: userIdsAndDistances.map((data) => data.userId),
          locationStartTime: new Date(),
        }
      );
    }

    userIdsAndDistances.sort((a, b) => a.distance - b.distance);
    const responseData = {
      requestLocation: { userId },
      usersWithinRadius: userIdsAndDistances,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred while updating data" });
  }
});

//Get all shared location
router.post("/getLocation", async (req, res) => {
  const { requestID } = req.body;

  try {
    const now = new Date();
    const result = await SharedLocation.aggregate([
      {
        $match: {
          usersWithinRadius: requestID,
          // locationStartTime: {
          //   $gte: new Date(now - 5 * 60 * 1000), //5 min
          // },
          isActive: true,
          sharedUserId: { $ne: requestID },
        },
      },
      {
        $project: {
          _id: 0,
          sharedUserId: 1,
          sharedUsername: 1,
          sharedLat: 1,
          sharedLong: 1,
          locationStartTime: 1,
        },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ message: "An error occurred" });
  }
});

//Update if miss leading
router.patch("/updateIsActive", async (req, res) => {
  const { sharedUserId, sharedUsername, isActive } = req.body;

  try {
    const existingData = await SharedLocation.findOne({
      sharedUserId: sharedUserId,
    });

    if (!existingData) {
      return res.status(404).json({ message: "User not found" });
    }
    existingData.isActive = isActive;
    existingData.sharedUsername = sharedUsername;
    await existingData.save();

    res.status(200).json({ message: "Miss leading successfully reported" });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).json({ message: "An error occurred" });
  }
});

module.exports = router;
