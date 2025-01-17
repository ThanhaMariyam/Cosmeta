const mongoose = require('mongoose')

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    otpExpiry: {
        type: Date,
        required: true,
        index: { expires: 60 }
    }
})

module.exports = mongoose.model('Otp', otpSchema); 
