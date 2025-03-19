const mongoose = require("mongoose");
const userSchema=require('../../model/userModel')
const addresSchema=require('../../model/address')
const cartSchema=require('../../model/cartModel')
const productSchema=require('../../model/productModal')
const orderSchema=require('../../model/orderModel')
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const loadCheckout=async(req,res)=>{
    const userId=req.session.user._id
    const cart=await cartSchema.findOne({userId}).populate({
        path: 'product.productId',
        select: 'name images price' 
    });
    cart.subTotal = cart.product.reduce(
        (sum, item) => sum + item.productId.price * item.quantity,
        0
      );
      cart.discount = Math.round(cart.subTotal * 0.2);
      cart.deliveryCharge = 50;
      cart.totalPrice = cart.subTotal - cart.discount + cart.deliveryCharge;
    const userAddress=await addresSchema.find()
    
    
    const defaultAdd=await addresSchema.findOne({isPrimary:true})
    const cartProducts = cart ? cart.product.map(item => ({
        productId: item.productId,
        quantity: item.quantity 
    })) : [];
     
    res.render("user/checkOut",{userAddress,defaultAdd,cartProducts,cart})
}

const addCheckoutAddress=async(req,res)=>{
    try{
        
           
              const userId=req.session.user._id
          
              const{firstName,lastName,email,phone,city,streetAddress,pincode,landmark,state,country}=req.body
              const{isPrimary}=req.body
            
              const newAddress=new addresSchema({
                userId,
                firstName,
                lastName,
                email,
                phone,
                city,
                streetAddress,
                pincode,
                landmark,
                state,
                country,
                isPrimary
              })
            
              
              await newAddress.save()
              res.redirect("/checkout")
    }
    catch(error){
        res.status(500).send("error")
    }
   
}


const placeOrder=async(req,res)=>{
try{
 
    const userId=req.session.user._id
    
     
    const address=await addresSchema.findOne({isPrimary:true, userId:userId})
    console.log(address)
    if(!address){
        return res.status(400).json({success:false,message:"invalid address selection"})
        
    }
    
   
    const cart=await cartSchema.findOne({userId:userId}).populate("product.productId")
    if (!cart) {
        return res.status(400).json({ success: false, message: "Cart is empty." });
    }
    let subTotal = cart.product.reduce((sum, item) => {
        return sum + item.productId.price * item.quantity;
    }, 0);

    let discount = Math.round(subTotal * 0.2); // 20% discount
    let deliveryCharge = 50;
    let totalAmount = subTotal - discount + deliveryCharge;

    
        const newOrder=new orderSchema({
            orderId:"#"+Date.now(),
            user:userId,
            products: cart.product.map(item => ({
                product: item.productId._id,
                name:item.productId.name,
                quantity: item.quantity,
                price: item.productId.price,
                images: item.productId.images.length > 0 ? item.productId.images[0] : null,
            })),
            totalAmount,
            paymentMethod:"Cash on Delivery",
            paymentStatus: "Pending",
            deliveryAddress:address._id,
            orderStatus:"Processing",
            estimateDelivery:new Date(Date.now()+5*24*60*60*1000)
        })
        
        console.log(newOrder)
        await newOrder.save()
     
        for (let item of cart.product) {
            await productSchema.updateOne(
                { _id: item.productId._id },
                { $inc: { stock: -item.quantity } }  
            );
        }
        await cartSchema.updateOne({ userId: userId }, { $set: { product: [], totalPrice: 0 } });
      

     

        let bonusPoints = Math.floor(totalAmount / 1000) * 10; 
        if (bonusPoints > 0) {
            await userSchema.updateOne({ _id: userId }, { $inc: { bonusPoints: bonusPoints } });
        }

        

        return res.json({ success: true, message: `Order placed successfully. You earned ${bonusPoints} bonus points!` });

}
catch(error){
    console.log(error);
    
    res.status(500).json({success:false,message:"Internal server error"})
}
}

const getconfirm=async(req,res)=>{
    try{
        const userId=req.session.user._id
        const order = await orderSchema.findOne({ user: userId}).populate("deliveryAddress")
        console.log(order)
        const similarProducts=await productSchema.find().sort({stock:-1}).limit(2)
        
        const bonus=await userSchema.findById(userId).select("bonusPoints")
            res.render("user/orderConfirmation",{similarProducts,order,bonus})    
    }
    catch(error){
        console.log(error)
        res.status(500).send(error)
    }
    

}

const order=async(req,res)=>{
    try{
          const userId=req.session.user._id
        const orders=await orderSchema.find({user:userId})
        
        const cartProducts=await cartSchema.findOne({userId}).populate("product.productId")
        if (!cartProducts) {
            return res.status(400).json({ success: false, message: "Cart is empty." });
        }
        res.render("user/orders",{orders,cartProducts})

    }
    catch(error){
        console.log(error);
        res.status(500).json({success:false,message:"Internal Server Error"})
        
    }
}
const orderDetails=async(req,res)=>{
    try{
        const userId=req.session.user._id
        const orderId=req.params.id
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ success: false, message: "Invalid order ID" });
        }
     
      const orders=await orderSchema.findOne({user:userId, _id:orderId}).populate("products.product")
      const orderAddress = await orderSchema.findOne({ user: userId,_id:orderId}).populate("deliveryAddress")
      
      res.render("user/orderDetails",{orders,orderAddress,orderId})

  }
  catch(error){
      console.log(error);
      res.status(500).json({success:false,message:"Internal Server Error"})
      
  }
}
const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await orderSchema.findById(orderId).populate("products.product");

        if (!order) {
            return res.status(404).send("Order not found");
        }

        const invoiceDir = path.join(__dirname, "../invoices");
        if (!fs.existsSync(invoiceDir)) {
            fs.mkdirSync(invoiceDir, { recursive: true });
        }

        const filePath = path.join(invoiceDir, `invoice-${orderId}.pdf`);
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

       
        doc.fontSize(20).text("Invoice", { align: "center" });
        doc.moveDown();
        doc.fontSize(14).text(`Order ID: #${order.orderId}`);
        doc.text(`Date: ${order.placedAt.toDateString()}`);
        doc.moveDown();

     
        doc.fontSize(12).text("Products:", { underline: true });
        doc.moveDown();

        const startX = 50;
        let y = doc.y;

      
        doc.font("Helvetica-Bold");
        doc.text("Name", startX, y, { width: 250 });
        doc.text("Quantity", startX + 250, y, { width: 100, align: "center" });
        doc.text("Price (Rs.)", startX + 350, y, { width: 100, align: "right" });
        doc.moveDown(0.5);
        doc.font("Helvetica");
        doc.text("-----------------------------------------------------------------", startX, doc.y);
        doc.moveDown(0.5);

        
        order.products.forEach((item) => {
            y = doc.y;
            doc.text(item.product.name, startX, y, { width: 250 });
            doc.text(item.quantity.toString(), startX + 250, y, { width: 100, align: "center" });
            doc.text(`Rs.${item.product.price}`, startX + 350, y, { width: 100, align: "right" });
            doc.moveDown();
        });

        doc.moveDown();
        doc.text("-----------------------------------------------------------------", startX, doc.y);
        doc.moveDown();

    
        const subTotal = order.products.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const discount = Math.round(subTotal * 0.2);
        const deliveryCharge = 50;
        const totalPrice = subTotal - discount + deliveryCharge;

       
        doc.fontSize(12).text("Price Details:", { underline: true });
        doc.moveDown(0.5);
        doc.font("Helvetica");
        doc.text(`Subtotal: Rs.${subTotal}`, { align: "right" });
        doc.text(`Discount (20%): -Rs.${discount}`, { align: "right" });
        doc.text(`Delivery Charge: Rs.${deliveryCharge}`, { align: "right" });
        doc.moveDown();
        doc.font("Helvetica-Bold").text(`Total Price: Rs.${totalPrice}`, { align: "right" });

     
        doc.moveDown();
        doc.fontSize(12).text("Thank you for your purchase!", { align: "center" });

        doc.end();

        writeStream.on("finish", () => {
            res.download(filePath, `invoice-${orderId}.pdf`, (err) => {
                if (err) {
                    console.log(err);
                    res.status(500).send("Error downloading invoice");
                }
                fs.unlinkSync(filePath);
            });
        });

    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { reason } = req.body;
        const orderId = req.params.orderId;

        if (!reason) {
            return res.status(400).json({ success: false, message: "Cancellation reason is required." });
        }

        const order = await orderSchema.findById(orderId).populate("products.product");
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }


       
        order.orderStatus = "Canceled";

        order.products.forEach(product => {
            product.status = 'Canceled';
        });

        order.cancellationReason = reason;
        await order.save();

    
        for (let item of order.products) {
            await productSchema.updateOne(
                { _id: item.product._id },
                { $inc: { stock: item.quantity } }
            );
        }

        return res.json({ success: true, message: "Order canceled successfully." });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const cancelItem=async(req,res)=>{
    
    const { orderId, productId } = req.params;
    const { reason, productIndex } = req.body;
    try {
        const order = await orderSchema.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const item = order.products[productIndex];
        if (!item || item.product.toString() !== productId) {
            return res.status(400).json({ success: false, message: "Item not found in order" });
        }

        if (item.status === 'Canceled') {
            return res.status(400).json({ success: false, message: "Item is already canceled." });
        }

        // Update order item
        item.status = 'Canceled';
        item.cancelReason = reason;

        // Increment product stock
        const product = await productSchema.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        product.stock += item.quantity;  // Increase stock by the canceled quantity
        await product.save();

        await order.save();

        const allItemsCanceled = order.products.every(p => p.status === 'Canceled');
        if (allItemsCanceled) {
            order.orderStatus = 'Canceled';
            order.cancellationReason = "All items canceled individually";
            await order.save();
        }


        res.json({ success: true, message: "Item canceled and stock updated.", orderStatus:order.orderStatus  });
        
    } catch (error) {
        console.error("Error canceling order item:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }

}
const returnItem=async(req,res)=>{
    const { orderId, productId } = req.params;
    const { reason, productIndex } = req.body;

    try{
        const order = await orderSchema.findById(orderId)
        if (!order) {
            return res.json({ success: false, message: 'Order not found.' });
        }

       
        order.products[productIndex].status = 'Return Requested';
        order.products[productIndex].returningReason = reason;
        order.products[productIndex].returnRequestedAt = new Date();

        await order.save();

        

        return res.json({ success: true, message: 'Return request submitted.' });

    }
    catch(error){
        console.log(error)
        return res.json({ success: false, message: 'Internal Server Error.' });
    }
}

module.exports={
    loadCheckout,
    addCheckoutAddress,
    placeOrder,
    getconfirm,
    orderDetails,
    order,
    downloadInvoice,
    cancelOrder,
    cancelItem,
    returnItem
}