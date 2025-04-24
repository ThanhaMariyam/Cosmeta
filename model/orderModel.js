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
        category:{
            type:String,
            required:true
        },
        brand:{
            type:String,
            required:true
        },
        images:{
            type:[String],
            required:true
        },
        status: {
             type: String,
              enum: ["Pending","Return Requested", "Canceled","Returned","Delivered"],
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
    couponApplied:{
        type:String,
        default:"NIL"
    },
    couponDiscount: {
        type: Number,
        default: 0
    },
    offerDiscount: {
        type: Number,
        default: 0
      },
    
    paymentMethod:{
        type:String,
        enum:["Cash on Delivery","online payment","Wallet" ],
        required:true
    },
    paymentStatus:{
        type:String,
        enum:["Pending","Paid","Failed","Refunded"],
        default:"pending"
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
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
        enum:["pending","Processing","Shipped","Delivered","Canceled","Returned","Return Requested"],
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