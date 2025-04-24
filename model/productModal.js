const mongoose=require('mongoose')
const productSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    brand:{
        type:String,
        required:true
    },
    category:{
        type:String,
        required:true
    },
    price:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        required:true
    },
    images:{
        type:[String],
        required:true
    },
    isListed:{
        type:Boolean,
        default:true

    },
    productOffer: {
        type: Number,
        default: 0
      },
    shades:[{
        color:{
            type:String,
            required:true
        },
        name:{
            type:String,
            required:true
        }
    }],
    description:{
        type:String
    }
    
},
{timestamps:true})




module.exports=mongoose.model('product',productSchema)