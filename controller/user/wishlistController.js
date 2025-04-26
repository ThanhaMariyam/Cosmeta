const wishlistSchema=require('../../model/wishlistModel')
const productSchema=require('../../model/productModal')
const httpStatus=require("../../utils/httpStatus")

const addWishlist= async (req, res) => {
    try {
           if (!req.session.user) {
                return res
                  .status(httpStatus.HttpStatus.UNAUTHORIZED)
                  .json({
                    success: false,
                    message: "unauthorized. please login to add items to cart",
                  });
              }

        const userId = req.session.user._id;
        if (!userId) {
            return res.status(httpStatus.HttpStatus.UNAUTHORIZED).json({ success: false, message: 'User not logged in' });
        }

        const  productId = req.params.id;
        console.log(productId)
        const product = await productSchema.findById(productId);
        console.log(product)

        if (!product) {
            return res.status(httpStatus.HttpStatus.NOT_FOUND).json({ success: false, message: 'Product not found' });
        }

        let wishlist = await wishlistSchema.findOne({ userId });

        if (!wishlist) {
            wishlist = await wishlistSchema.create({ userId, products: [] });
        }

        if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
        }

        res.status(httpStatus.HttpStatus.OK).json({ success: true, message: "Product added to wishlist" });
    } catch (error) {
        console.error(error);
        res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to add product to wishlist" });
    }
}

const remvWishlist=async (req, res) => {
    try {
        const userId = req.session.user._id;
        if(!userId){
            return res.status(httpStatus.HttpStatus.UNAUTHORIZED).json({success:false,message:"user not logged in"})
        }
        const productId = req.params.id;

        const wishlist = await wishlistSchema.findOne({ userId });

        if (wishlist) {
            wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
            await wishlist.save();
        }

        res.status(httpStatus.HttpStatus.OK).json({ success: true, message: "Product removed from wishlist" });
    } catch (error) {
        console.error(error);
        res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove product from wishlist" });
    }
}

const loadWishlist=async (req, res) => {
    try {
        const userId = req.session.user._id;
        if (!userId) {
            return res.redirect('/login');
        }
        let wishlist = await wishlistSchema.findOne({ userId }).populate('products');
        if (!wishlist) {
            wishlist = { products: [] }; 
        }
        
        res.render('user/wishlist', { wishlist});
    } catch (error) {
        console.error(error);
        res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
    }
}

module.exports={
    loadWishlist,
    remvWishlist,
    addWishlist
}