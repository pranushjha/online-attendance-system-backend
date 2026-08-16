const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
    {
        // ==========================================
        // CLASS NAME
        // ==========================================

        className: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },

        // ==========================================
        // CLASS TEACHER
        // ==========================================

        classTeacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Class", classSchema);