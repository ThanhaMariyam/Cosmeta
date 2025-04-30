const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema({
   
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    balance: {
        type: Number,
        default: 0.0
    },
    transactionId:{
        type:String,
           
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});


walletSchema.pre("save", function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model("wallet", walletSchema);
