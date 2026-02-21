const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true },

    password: { type: String, required: true },

    isAdmin: { type: Boolean, default: false },

    // ✅ NEW — profile picture for ticket identity verification
    profilePicture: {
      type: String,
      default: "",
    },

    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Business" }],
  },
 