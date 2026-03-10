const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongodbUri);
    console.log("Database Connected");
  } catch (error) {
    console.error("Cannot connect to MongoDB\n", error);
    process.exit(1);
  }
};

module.exports = connectDB;
