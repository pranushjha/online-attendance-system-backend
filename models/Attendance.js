const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
    {
        // ==========================================
        // CLASS
        // ==========================================

        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        },

        // ==========================================
        // ATTENDANCE DATE
        // ==========================================

        date: {
            type: Date,
            required: true,
        },

        // ==========================================
        // TEACHER WHO MARKED ATTENDANCE
        // ==========================================

        markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Teacher",
            required: true,
        },

        // ==========================================
        // STUDENT ATTENDANCE
        // ==========================================

        students: [
            {
                studentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Student",
                    required: true,
                },

                status: {
                    type: String,
                    enum: ["Present", "Absent"],
                    default: "Present",
                    required: true,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// ==========================================
// PREVENT DUPLICATE CLASS + DATE RECORDS
// ==========================================

attendanceSchema.index(
    {
        classId: 1,
        date: 1,
    },
    {
        unique: true,
    }
);

module.exports = mongoose.model("Attendance", attendanceSchema);