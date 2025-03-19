const mongoose=require("mongoose")
const { Schema } = mongoose;
const addresSchema=new mongoose.Schema({
    userId:{
        type: Schema.Types.ObjectId,
        ref:"user",
        required:true


    },
    firstName:{
        type:String,
        required:true
    },
    lastName:{
        type:String,
        required:true
    },
    phone:{
        type:Number,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    city:{
        type:String,
        required:true

    },
    streetAddress:{
        type:String,
        required:true
    },
    landmark:{
        type:String
    },
    pincode:{
        type:Number,
        required:true
    },
    state:{
        type:String,
        required:true

    },
    country:{
        type:String,
        required:true
    },
    isPrimary:{
        type:Boolean,
        default:false
    }

})

module.exports=mongoose.model("address",addresSchema)