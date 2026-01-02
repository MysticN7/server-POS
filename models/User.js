const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLE_OPTIONS = ['ADMINISTRATIVE', 'ADMIN', 'MANAGER', 'SALESPERSON', 'STAFF'];

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        default: function () {
            return this.username || 'User';
        }
    },
    username: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ROLE_OPTIONS,
        default: 'SALESPERSON'
    },
    permissions: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'INACTIVE'],
        default: 'ACTIVE'
    },
    // Store the plaintext password set by admin for reference (only admin can view)
    lastSetPassword: {
        type: String,
        select: false  // Not included in queries by default
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Hash password before saving & keep username/name in sync
userSchema.pre('save', async function (next) {
    if (!this.username && this.name) {
        this.username = this.name.toLowerCase().replace(/\s+/g, '.');
    }

    if (!this.name && this.username) {
        this.name = this.username;
    }

    if (this.isModified('password')) {
        // Store the plaintext password before hashing (for admin reference)
        this.lastSetPassword = this.password;
        this.password = await bcrypt.hash(this.password, 10);
    }

    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLE_OPTIONS = ROLE_OPTIONS;
