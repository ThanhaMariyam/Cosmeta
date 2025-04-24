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
        min:0
        
    },
    isListed:{
        type:Boolean,
        default:true

    },
    origin: {
        type: String,
        default: "Unknown",
        trim: true
    },
}, {timestamps:true
})

module.exports=mongoose.model("brand",brandSchema)