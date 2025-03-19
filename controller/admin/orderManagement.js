const userSchema=require("../../model/userModel")
const orderSchema=require("../../model/orderModel")
const productSchema=require("../../model/productModal")


const orderLists=async(req,res)=>{
    try{
        
    const orders=await orderSchema.find().populate("user").populate("deliveryAddress")
    if(!orders){
        return res.status(400).render("user/404")
    }
    res.render("admin/orderManagement",{orders})

    }
    catch(error){
        console.log(error);
        res.status(500).send("internal server error")
        
    }
    
}
const orderDetails=async(req,res)=>{
    const orderId = req.params.orderId
    const orders=await orderSchema.findById(orderId).populate("user").populate("deliveryAddress").populate("products.product")
    let subtotal = orders.products.reduce((acc, item) => {
        return acc + item.product.price * item.quantity;
    }, 0);
    res.render("admin/orderDetails",{orders,subtotal})
}

const orderStatus=async(req,res)=>{
    try{
        const { orderId } = req.params;
        const { status } = req.body;

        const updatedOrder = await orderSchema.findByIdAndUpdate(orderId, { orderStatus: status }, { new: true });

        if (updatedOrder) {
            res.json({ success: true, newStatus: updatedOrder.orderStatus });
        } else {
            res.json({ success: false, message: 'Order not found' });
        }
    }
    catch(error){
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal server error' });
        
    }
}
const returnOrder=async(req,res)=>{
    try{
        
    const orders=await orderSchema.find().populate("user").populate("products.product")
    if(!orders){
        return res.status(400).render("user/404")
    }
    
    res.render("admin/return",{orders})

    }
    catch(error){
        console.log(error);
        res.status(500).send("internal server error")
        
    }
    
}
const approveReturn = async (req, res) => {
    const { orderId, productId } = req.params;
    const order = await orderSchema.findById(orderId);
    const product = order.products.find(p => p.product.toString() === productId);

    if (product) {
        product.status = 'Returned'; 
        await order.save();
        return res.json({ success: true, message: 'Return Approved' });
    }
    res.json({ success: false, message: 'Product not found' });
};

const rejectReturn = async (req, res) => {
    const { orderId, productId } = req.params;
    const order = await orderSchema.findById(orderId);
    const product = order.products.find(p => p.product.toString() === productId);

    if (product) {
        product.status = 'Pending';  
        product.returningReason = undefined;
        product.returnRequestedAt = undefined;
        await order.save();
        return res.json({ success: true, message: 'Return Rejected' });
    }
    res.json({ success: false, message: 'Product not found' });
};


module.exports={
    orderLists,
    orderDetails,
    orderStatus,
    returnOrder,
    approveReturn,
    rejectReturn
}