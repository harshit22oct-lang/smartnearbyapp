const mongoose = require("mongoose");
const Business = require("./models/Business");
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI);

const seedData = async () => {
  await Business.deleteMany();

  await Business.insertMany([
    { name: "Restaurant A", category: "Food", location: "Bhopal" },
    { name: "Cafe Coffee", category: "Food", location: "Indore" },
    { name: "Gym Center", category: "Fitness", location: "Delhi" },
    { name: "Medical Store", category: "Pharmacy", location: "Mumbai" },
  ]);

  console.log("Database Seeded 🌱");
  process.exit();
};

seedData();
