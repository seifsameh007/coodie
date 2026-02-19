const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    originalName: String,
    fileName: String,
    path: String,
    size: Number,
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const scriptSectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        default: ''
    },
    order: {
        type: Number,
        default: 0
    }
});

const projectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    deadline: {
        type: Date,
        default: null  // null = open / no deadline
    },
    deadlineType: {
        type: String,
        enum: ['open', 'fixed'],
        default: 'open'
    },
    type: {
        type: String,
        enum: ['personal', 'work', 'help'],
        default: 'personal'
    },
    script: [scriptSectionSchema],
    notes: {
        type: String,
        default: ''
    },
    files: [fileSchema],
    completionPercent: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

projectSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Project', projectSchema);
