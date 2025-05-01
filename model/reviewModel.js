const mongoose=require("mongoose")
const reviewSchema=new mongoose.Schema({
    product:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"product"
    },
    user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user"
    },
        content:{
            type:String,
            required:true
        } ,
        createdAt:{
            type:Date,
            default:Date.now
        }
    
})
module.exports=mongoose.model('review',reviewSchema)