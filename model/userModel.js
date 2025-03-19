const mongoose=require('mongoose')
const userSchema=new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    },
   
    isVerified:{
        type:Boolean,
        default:false
        
    },
    isBlocked:{
        type:Boolean,
         default:false
    },
    googleId:{
        type:String
    },
    fullName:{
        type:String
    },
    DOB:{
        type:Date
    },
    bonusPoints:{
        type:Number,
        default:0
    }


})
module.exports=mongoose.model("user",userSchema)
