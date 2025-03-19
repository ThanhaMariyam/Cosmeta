const wishlistSchema=require('../../model/wishlistModel')
const productSchema=require('../../model/productModal')

const addWishlist= async (req, res) => {
    try {
        const userId = req.session.user._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not logged in' });
        }

        const  productId = req.params.id;
        const product = await productSchema.findById(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let wishlist = await wishlistSchema.findOne({ userId });

        if (!wishlist) {
            wishlist = await wishlistSchema.create({ userId, products: [] });
        }

        if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
        }

        res.json({ success: true, message: "Product added to wishlist" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to add product to wishlist" });
    }
}

const remvWishlist=async (req, res) => {
    try {
        const userId = req.session.user._id;
        if(!userId){
            return res.status(401).json({success:false,message:"user not logged in"})
        }
        const productId = req.params.id;

        const wishlist = await wishlistSchema.findOne({ userId });

        if (wishlist) {
            wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
            await wishlist.save();
        }

        res.json({ success: true, message: "Product removed from wishlist" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to remove product from wishlist" });
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
            wishlist = { products: [] }; // Ensure wishlist always exists
        }
        
        res.render('user/wishlist', { wishlist});
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports={
    loadWishlist,
    remvWishlist,
    addWishlist
}