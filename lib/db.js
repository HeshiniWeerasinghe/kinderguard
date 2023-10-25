const mongooseDB = require("mongoose");
const dbMongoConfig = (async) => {
  mongooseDB
    .connect(
      "mongodb+srv://Admin:Admin@cluster0.tooena7.mongodb.net/kinderguard?retryWrites=true&w=majority"
    )
    .then(() => {
      console.log("Atlas DataBase is Connected");
    })
    .catch((err) => {
      console.log(" Atlas DataBase is Not connected");
      console.log(err);
    });
};
module.exports = dbMongoConfig;
