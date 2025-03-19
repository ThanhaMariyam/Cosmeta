const mongoose=require("mongoose")
const {Schema}=mongoose
const wishlistSchema=new mongoose.Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    products:[{
        type:Schema.Types.ObjectId,
        ref:"product"
    }]
})

module.exports=mongoose.model("wishlist",wishlistSchema)