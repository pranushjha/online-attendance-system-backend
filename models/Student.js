const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        // ==========================================
        // ROLL NUMBER
        // ==========================================

        rollNo: {
            type: String,
            required: true,
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


// ==================================================
// COMPOUND UNIQUE INDEX
// ==================================================
//
// Roll number must be unique INSIDE a class.
//
// Example:
//
// Standard-1A → Roll 1  ✅
// Standard-2A → Roll 1  ✅
// Standard-3A → Roll 1  ✅
//
// But:
//
// Standard-1A → Roll 1
// Standard-1A → Roll 1  ❌
//
// ==================================================

studentSchema.index(
    {
        classId: 1,
        rollNo: 1,
    },
    {
        unique: true,
    }
);


module.exports = mongoose.model(
    "Student",
    studentSchema
);