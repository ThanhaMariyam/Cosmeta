const mongoose=require("mongoose")
const orderSchema=new mongoose.Schema({
    orderId:{
        type:String,
        unique:true,
        required:true
    },
    user:{
        type:mongoose.Schema.Types.ObjectId, 
        ref:"user",
        required:true
    },
    products:[{
        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"product",
            required:true
        },
        name:{
            type:String,
            required:true,
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            required:true
        },
        images:{
            type:[String],
            required:true
        },
        status: {
             type: String,
              enum: ["Pending","Return Requested", "Canceled"],
               default: "Pending"
             },
             cancelReason: {
                 type: String
                 },
                 returningReason:{
                    type:String
                 },
                 returnRequestedAt: {  
                    type: Date
                }

    }],
    totalAmount:{
        type:Number,
        required:true
    },
    paymentMethod:{
        type:String,
        enum:["Cash on Delivery","Credit Card","Debit Card","UPI","Net Banking" ],
        required:true
    },
    paymentStatus:{
        type:String,
        enum:["Pending","Paid","Failed"],
        default:"pending"
    },
    transactionId:{
        type:String,
        default:null

    },
    deliveryAddress:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"address",
        required:true
    },
    orderStatus:{
        type:String,
        enum:["Processing","Shipped","Delivered","Canceled","Returned","Return Requested"],
        default:"Processing"
    },
    cancellationReason:{
        type:String
    },
    estimateDelivery:{
        type:Date
    },
    placedAt:{
        type:Date,
        default:Date.now
    }
})

module.exports=mongoose.model("order",orderSchema)