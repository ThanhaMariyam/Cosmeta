const mongoose = require("mongoose");

const walletHistorySchema = new mongoose.Schema({
    wallet_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "wallet",
        required:true
    },
    transactionId: {
        type: String,
        
      },
      
    transaction_amount: {
        type: Number,
        
    },
    transaction_type: {
        type: String,
        enum: ["credited", "debited"],
        
    },
    transaction_date: {
        type: Date,
        default: Date.now
    },
    description: {
        type: String
    },
    order_id: {
        type: String
    }
});

module.exports = mongoose.model("walletHistory", walletHistorySchema);
