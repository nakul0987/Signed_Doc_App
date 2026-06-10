const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Pending','Signed','Rejected'],
        default: 'Pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Document',DocumentSchema);
