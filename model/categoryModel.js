const mongoose=require('mongoose')

const categorySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    imageUrl:{
        type:String,
        required:true

    },
    isListed:{
        type:Boolean,
        default:true

    },
    description:{
        type:String,
        default:''
    },
    
    productCount:{    
        type:Number,
        default:0
    },
    offer: {
        discountPercentage: { 
            type: Number, 
            default: 0 
        },
        isActive: {
             type: Boolean, 
             default: false 
            },
    }
},{timestamps:true})

module.exports=mongoose.model("category",categorySchema)