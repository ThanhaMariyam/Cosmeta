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
    description:{
        type:String,
        default:''
    },
    productCount:{    
        type:Number,
        default:0
    },
},
{timestamps:true}
)

module.exports=mongoose.model("category",categorySchema)