const mongoose=require('mongoose')
const brandSchema=new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: "",
        trim: true
    },
    productCount: {
        type: Number,
        default: 0,
        min: 0
    },
    origin: {
        type: String,
        default: "Unknown",
        trim: true
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    }
}, {timestamps:true
})

module.exports=mongoose.model("brand",brandSchema)