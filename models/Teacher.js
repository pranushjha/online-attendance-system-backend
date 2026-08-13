const mongoose = require("mongoose");const teacherSchema = new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },
  
      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },
  
      password: {
        type: String,
        required: true,
      },
  
      assignedClass: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Class",
        default: null,
      },
  
      role: {
        type: String,
        enum: ["teacher"],
        default: "teacher",
      },
    },
    {
      timestamps: true,
    }
  );
  module.exports = mongoose.model("Teacher", teacherSchema);