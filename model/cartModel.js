const mongoose=require("mongoose")
const{Schema}=mongoose
const cartSchema=new mongoose.Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref:"user",
        required:true
    },
    product:[{
        productId:{
            type: Schema.Types.ObjectId,
            ref:"product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        brand:{
            type:String,
            required:true
        },
        image:{
            type:String,
            required:true
        }


    }],
    subTotal:{
        type:Number,
    },
    discount:{
        type:Number
    },
    totalPrice:{
        type:Number,
    },
    deliveryCharge:{
        type:Number,
        default:50
    },   
},

{timestamps:true}

)

module.exports=mongoose.model("cart",cartSchema)