const mongoose = require('mongoose');

const jobCardSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
        default: 'PENDING'
    },
    dueDate: {
        type: Date
    },
    completedDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for status and date queries
jobCardSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('JobCard', jobCardSchema);
