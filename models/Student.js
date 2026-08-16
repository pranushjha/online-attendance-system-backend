const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        // ==========================================
        // ROLL NUMBER
        // ==========================================

        rollNo: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // ==========================================
        // STUDENT NAME
        // ==========================================

        name: {
            type: String,
            required: true,
            trim: true,
        },

        // ==========================================
        // ASSIGNED CLASS
        // ==========================================

        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },

        // ==========================================
        // ACTIVE STATUS
        // ==========================================

        active: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Student", studentSchema);