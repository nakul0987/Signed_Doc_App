const mongoose = require("mongoose");

const SignatureSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: 'true'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: 'true'
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    page: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        default: 'signed'
    }
})

module.exports = mongoose.model('Signature',SignatureSchema);