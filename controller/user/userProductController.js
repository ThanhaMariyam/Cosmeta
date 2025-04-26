const categorySchema = require("../../model/categoryModel");
const brandSchema = require("../../model/brandModel");
const productSchema = require("../../model/productModal");
const userSchema = require("../../model/userModel");
const cartSchema = require("../../model/cartModel");
const wishlistSchema = require("../../model/wishlistModel");
const httpStatus = require("../../utils/httpStatus");

const getHome = async (req, res) => {
  try {
    const limit = 8;

    const categories = await categorySchema.find({ isListed: true }).lean();
    const selectedCategory = req.query.category
      ? req.query.category.trim()
      : "";

    let filter = {};

    if (selectedCategory) {
      const category = await categorySchema
        .findOne({ name: selectedCategory })
        .lean();
      if (category) {
        console.log("Category Found:", category.name, category._id);
        filter.category = category._id;
      } else {
        console.log("Category not found:", selectedCategory);
      }
    }

    const categoryOffersMap = {};
    for (const cat of categories) {
      if (cat.offer?.isActive) {
        const normalizedCatName = cat.name.trim().toLowerCase();
        categoryOffersMap[normalizedCatName] = cat.offer.discountPercentage;
      }
    }

    let sortOption = req.query.sort;
      let sortQuery = { stock: -1, createdAt: -1 }; 

      if (sortOption === 'price-asc') {
        sortQuery = { discountedPrice: 1 };
      } else if (sortOption === 'price-desc') {
        sortQuery = { discountedPrice: -1 };
      }

      let products = await productSchema
        .find(filter).limit(12)
        .populate("category", "name imageUrl")
        .sort({ stock: -1, price: 1 })
        .lean();

    for (let product of products) {
      const productDiscount = product.productOffer || 0;

      let categoryNameRaw = "";

      if (
        product.category &&
        typeof product.category === "object" &&
        product.category.name
      ) {
        categoryNameRaw = product.category.name;
      } else if (typeof product.category === "string") {
        const matchedCat = categories.find(
          (cat) => cat._id.toString() === product.category
        );
        categoryNameRaw = matchedCat?.name || "";
      }

      const categoryName = categoryNameRaw.trim().toLowerCase();
      const categoryDiscount = categoryOffersMap[categoryName] || 0;

      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      product.highestDiscount = highestDiscount;
      const originalPrice = Number(product.price);
      product.discountedPrice = Math.round(
        originalPrice - (originalPrice * highestDiscount) / 100
      );
    }

    if (sortOption === 'price-asc') {
      products.sort((a, b) => a.discountedPrice - b.discountedPrice);
    } else if (sortOption === 'price-desc') {
      products.sort((a, b) => b.discountedPrice - a.discountedPrice);
    }

    let productOff = await productSchema
      .find({
        price: { $gte: 1500 },
        ...filter,
      })
      .populate("category", "name imageUrl")
      .sort({ stock: -1, price: 1 })
      .limit(limit)
      .lean();

    for (let product of productOff) {
      const productDiscount = product.productOffer || 0;

      let categoryNameRaw = "";

      if (
        product.category &&
        typeof product.category === "object" &&
        product.category.name
      ) {
        categoryNameRaw = product.category.name;
      } else if (typeof product.category === "string") {
        const matchedCat = categories.find(
          (cat) => cat._id.toString() === product.category
        );
        categoryNameRaw = matchedCat?.name || "";
      }

      const categoryName = categoryNameRaw.trim().toLowerCase();
      const categoryDiscount = categoryOffersMap[categoryName] || 0;

      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      product.highestDiscount = highestDiscount;
      const originalPrice = Number(product.price);
      product.discountedPrice = Math.round(
        originalPrice - (originalPrice * highestDiscount) / 100
      );
    }
    if (sortOption === "price-asc") {
      productOff.sort((a, b) => a.discountedPrice - b.discountedPrice);
    } else if (sortOption === "price-desc") {
      productOff.sort((a, b) => b.discountedPrice - a.discountedPrice);
    }

    let productInCart = [];
    let productInWish = [];

    if (req.session.user) {
      const userId = req.session.user._id;

      const cart = await cartSchema
        .findOne({ userId })
        .select("product.productId");
      if (cart) {
        productInCart = cart.product.map((item) => item.productId.toString());
      }

      const wishlist = await wishlistSchema
        .findOne({ userId })
        .select("products");
      if (wishlist) {
        productInWish = wishlist.products.map((productId) =>
          productId.toString()
        );
      }
    }

    res.render("user/home", {
      products,
      productOff,
      categories,
      productInCart,
      productInWish,
      selectedCategory,
      selectedSort: sortOption
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const googleHome = async (req, res) => {
  try {
    const limit = 8;
    const products = await productSchema
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const productOff = await productSchema
      .find({ price: { $gte: 1500 } })
      .sort({ stock: -1, price: 1 })
      .limit(limit)
      .lean();
    let productInCart = [];
    let productInWish = [];
    if (req.session.user) {
      const userId = req.session.user._id;
      const cart = await cartSchema
        .findOne({ userId })
        .select("product.productId");
      if (cart) {
        productInCart = cart.product.map((item) => item.productId.toString());
      }
      const wishlist = await wishlistSchema
        .findOne({ userId })
        .select("products");
      if (wishlist) {
        productInWish = wishlist.products.map((productId) =>
          productId.toString()
        );
      }
    }

    res.render("user/home", {
      products,
      productOff,
      productInCart,
      productInWish,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const getDetails = async (req, res) => {
  try {
    const user = req.session.user || null;
    const productId = req.params.id;
    const foundProduct = await productSchema.findById(productId);
    const userId = req.session.user._id;
    if (!foundProduct) {
      res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const category = await categorySchema
      .findById(foundProduct.category)
      .lean();

    if (!category) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const brand = await brandSchema.findById(foundProduct.brand).lean();

    if (!brand) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    let isWishExist = false;
    let isProductExist = false;
    if (user) {
      isProductExist = await cartSchema.findOne({
        userId: user._id,
        product: { $elemMatch: { productId } },
      });
      isWishExist = await wishlistSchema.findOne({
        userId: user._id,
        products: { $elemMatch: { productId } },
      });
    }

    const similarProducts = await productSchema
      .find({ category: foundProduct.category })
      .sort({ stock: -1 })
      .lean()
      .limit(8);

    res.render("user/Details", {
      product: foundProduct,
      category,
      brand,
      similarProducts,
      user,
      isProductExist,
      isWishExist,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const loadBrand = async (req, res) => {
  try {
    const user = req.session.user || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;
    const brands = await brandSchema
      .find({ isListed: true })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalUserBrand = await brandSchema.countDocuments({ isListed: true });
    const totalPages = Math.ceil(totalUserBrand / limit);
    res.render("user/userBrand", {
      brands,
      currentPage: page,
      totalPages,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const getBrandProd = async (req, res) => {
  try {
    const user = req.session.user || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const brandId = req.query.brand;
    const selectedSort = req.query.sort || '';
    if (!brandId) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const brand = await brandSchema.findById(brandId).lean();

    const categories = await categorySchema.find({ isListed: true }).lean();
    const categoryOffersMap = {};
    for (const cat of categories) {
      if (cat.offer?.isActive) {
        const normalizedCatName = cat.name.trim().toLowerCase();
        categoryOffersMap[normalizedCatName] = cat.offer.discountPercentage;
      }
    }

        let allProducts = await productSchema
      .find({ brand: brandId, isListed: true })
      .lean();

      if (selectedSort === 'price-asc') {
        allProducts.sort((a, b) => Number(a.price) - Number(b.price));
      } else if (selectedSort === 'price-desc') {
        allProducts.sort((a, b) => Number(b.price) - Number(a.price));
      } else {
        allProducts.sort((a, b) => b.stock - a.stock);
      }

      const products = allProducts.slice(skip, skip + limit);

    for (let product of products) {
      const productDiscount = product.productOffer || 0;

      let categoryNameRaw = "";
      if (typeof product.category === "string") {
        const matchedCat = categories.find(
          (cat) => cat._id.toString() === product.category
        );
        categoryNameRaw = matchedCat?.name || "";
      } else if (
        typeof product.category === "object" &&
        product.category.name
      ) {
        categoryNameRaw = product.category.name;
      }

      const categoryName = categoryNameRaw.trim().toLowerCase();
      const categoryDiscount = categoryOffersMap[categoryName] || 0;

      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      const originalPrice = Number(product.price);
      const discountedPrice = Math.round(
        originalPrice - (originalPrice * highestDiscount) / 100
      );

      product.highestDiscount = highestDiscount;
      product.discountedPrice = discountedPrice;
    }

    const totalUserBrandProduct = await productSchema.countDocuments({
      brand: brandId,
      isListed: true,
    });
    const totalPages = Math.ceil(totalUserBrandProduct / limit);
    let productInCart = [];
    let productInWish = [];
    if (req.session.user) {
      const userId = req.session.user._id;
      const cart = await cartSchema
        .findOne({ userId })
        .select("product.productId");
      if (cart) {
        productInCart = cart.product.map((item) => item.productId.toString());
      }
      const wishlist = await wishlistSchema
        .findOne({ userId })
        .select("products");
      if (wishlist) {
        productInWish = wishlist.products.map((productId) =>
          productId.toString()
        );
      }
    }
    res.render("user/brandProducts", {
      products,
      brand,
      currentPage: page,
      totalPages,
      user,
      productInCart,
      productInWish,
      selectedSort
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const getBrandProduct = async (req, res) => {
  try {
    const user = req.session.user || null;
    const productId = req.params.id;
    const foundProduct = await productSchema
      .findById(productId)
      .populate({ path: "brand", select: "name" });

    if (!foundProduct) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const brand = await brandSchema.findById(foundProduct.brand).lean();

    if (!brand) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const category = await categorySchema
      .findById(foundProduct.category)
      .lean();

    if (!category) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }

    const productDiscount = foundProduct.productOffer || 0;
    let categoryDiscount = 0;

    if (category.offer && category.offer.isActive) {
      categoryDiscount = category.offer.discountPercentage;
    }

    const highestDiscount = Math.max(productDiscount, categoryDiscount);
    const originalPrice = Number(foundProduct.price);
    const discountedPrice = Math.round(
      originalPrice - (originalPrice * highestDiscount) / 100
    );

    let isWishExist = false;
    let isProductExist = false;
    if (user) {
      isProductExist = await cartSchema.findOne({
        userId: user._id,
        product: { $elemMatch: { productId } },
      });
      isWishExist = await wishlistSchema.findOne({
        userId: user._id,
        products: productId,
      });
    }

    const allCategories = await categorySchema.find({}).lean();
    const categoryOffersMap = {};

    for (const cat of allCategories) {
      if (cat.offer?.isActive) {
        categoryOffersMap[cat.name.trim().toLowerCase()] =
          cat.offer.discountPercentage;
      }
    }
    const similarProducts = await productSchema
      .find({ category: foundProduct.category })
      .sort({ stock: -1 })
      .lean()
      .limit(8);

    for (let product of similarProducts) {
      const productDiscount = product.productOffer || 0;

      let categoryName = "";
      if (typeof product.category === "string") {
        const matchedCat = allCategories.find(
          (cat) => cat._id.toString() === product.category
        );
        categoryName = matchedCat?.name || "";
      } else if (
        typeof product.category === "object" &&
        product.category.name
      ) {
        categoryName = product.category.name;
      } else if (category?.name) {
        categoryName = category.name;
      }

      const categoryDiscount =
        categoryOffersMap[categoryName.trim().toLowerCase()] || 0;
      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      const originalPrice = Number(product.price);
      const discountedPrice = Math.round(
        originalPrice - (originalPrice * highestDiscount) / 100
      );

      product.highestDiscount = highestDiscount;
      product.discountedPrice = discountedPrice;
    }

    res.render("user/brandProdDetail", {
      product: foundProduct,
      category,
      brand,
      similarProducts,
      user,
      isProductExist,
      isWishExist,
      highestDiscount,
      discountedPrice,
      originalPrice,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const categoryLoad = async (req, res) => {
  try {
    const user = req.session.user || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const categories = await categorySchema
      .find({ isListed: true })
      .skip(skip)
      .limit(limit)
      .lean();
    const totalUserCat = await categorySchema.countDocuments({
      isListed: true,
    });
    const totalPages = Math.ceil(totalUserCat / limit);

    res.render("user/userCategory", {
      categories,
      currentPage: page,
      totalPages,
      user,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const getCategoryProd = async (req, res) => {
  try {
    const user = req.session.user || null;
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const categoryId = req.query.category;
    const selectedSort = req.query.sort || '';  

    if (!categoryId) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }

    const category = await categorySchema.findById(categoryId).lean();
    const categories = await categorySchema.find({ isListed: true }).lean();

    const categoryOffersMap = {};
    for (const cat of categories) {
      if (cat.offer?.isActive) {
        const normalizedCatName = cat.name.trim().toLowerCase();
        categoryOffersMap[normalizedCatName] = cat.offer.discountPercentage;
      }
    }

    let allProducts = await productSchema
  .find({ category: categoryId, isListed: true })
  .lean();

if (selectedSort === 'price-asc') {
  allProducts.sort((a, b) => Number(a.price) - Number(b.price));
} else if (selectedSort === 'price-desc') {
  allProducts.sort((a, b) => Number(b.price) - Number(a.price));
}


if (!selectedSort) {
  allProducts.sort((a, b) => b.stock - a.stock);
}



const products = allProducts.slice(skip, skip + limit);
    for (let product of products) {
      const productDiscount = product.productOffer || 0;

      let categoryNameRaw = "";
      if (typeof product.category === "string") {
        const matchedCat = categories.find(
          (cat) => cat._id.toString() === product.category
        );
        categoryNameRaw = matchedCat?.name || "";
      } else if (
        typeof product.category === "object" &&
        product.category.name
      ) {
        categoryNameRaw = product.category.name;
      } else if (category?.name) {
        categoryNameRaw = category.name;
      }

      const categoryName = categoryNameRaw.trim().toLowerCase();
      const categoryDiscount = categoryOffersMap[categoryName] || 0;

      const highestDiscount = Math.max(productDiscount, categoryDiscount);
      product.highestDiscount = highestDiscount;
      const originalPrice = Number(product.price);
      product.discountedPrice = Math.round(
        originalPrice - (originalPrice * highestDiscount) / 100
      );
    }

    const totalUserProduct = await productSchema.countDocuments({
      category: categoryId,
      isListed: true,
    });
    const totalPages = Math.ceil(totalUserProduct / limit);

    let productInCart = [];
    let productInWish = [];

    if (req.session.user) {
      const userId = req.session.user._id;
      const cart = await cartSchema
        .findOne({ userId })
        .select("product.productId");
      if (cart) {
        productInCart = cart.product.map((item) => item.productId.toString());
      }
      const wishlist = await wishlistSchema
        .findOne({ userId })
        .select("products");
      if (wishlist) {
        productInWish = wishlist.products.map((productId) =>
          productId.toString()
        );
      }
    }

    res.render("user/userProduct", {
      products,
      category,
      currentPage: page,
      totalPages,
      user,
      productInCart,
      productInWish,
      selectedSort
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const getProduct = async (req, res) => {
  try {
    const user = req.session.user || null;
    console.log(user);

    const productId = req.params.id;
    const foundProduct = await productSchema
      .findById(productId)
      .populate({ path: "category", select: "name" });

    if (!foundProduct) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const category = await categorySchema
      .findById(foundProduct.category)
      .lean();

    if (!category) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }
    const brand = await brandSchema.findById(foundProduct.brand).lean();

    if (!brand) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
    }

    const productDiscount = foundProduct.productOffer || 0;
    let categoryDiscount = 0;

    if (category.offer && category.offer.isActive) {
      categoryDiscount = category.offer.discountPercentage;
    }

    const highestDiscount = Math.max(productDiscount, categoryDiscount);
    const originalPrice = Number(foundProduct.price);
    const discountedPrice = Math.round(
      originalPrice - (originalPrice * highestDiscount) / 100
    );

    let isWishExist = false;
    let isProductExist = false;
    if (user) {
      isProductExist = await cartSchema.findOne({
        userId: user._id,
        product: { $elemMatch: { productId } },
      });

      isWishExist = await wishlistSchema.findOne({
        userId: user._id,
        products: productId,
      });
    }

    const categories = await categorySchema.find({ isListed: true }).lean();
    const categoryOffersMap = {};
    for (const cat of categories) {
      if (cat.offer?.isActive) {
        categoryOffersMap[cat.name.trim().toLowerCase()] =
          cat.offer.discountPercentage;
      }
    }
    const similarProducts = await productSchema
      .find({ category: foundProduct.category })
      .sort({ stock: -1 })
      .lean()
      .limit(8);

    for (let prod of similarProducts) {
      const prodDiscount = prod.productOffer || 0;
      let categoryName = "";

      if (typeof prod.category === "string") {
        const matchedCat = categories.find(
          (cat) => cat._id.toString() === prod.category
        );
        categoryName = matchedCat?.name || "";
      } else if (typeof prod.category === "object" && prod.category.name) {
        categoryName = prod.category.name;
      }

      const categoryDiscount =
        categoryOffersMap[categoryName.trim().toLowerCase()] || 0;
      const highest = Math.max(prodDiscount, categoryDiscount);
      const original = Number(prod.price);
      const discounted = Math.round(original - (original * highest) / 100);

      prod.highestDiscount = highest;
      prod.discountedPrice = discounted;
    }
    res.render("user/productDetails", {
      product: foundProduct,
      category,
      brand,
      similarProducts,
      user,
      isProductExist,
      isWishExist,
      highestDiscount,
      discountedPrice,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

module.exports = {
  categoryLoad,
  getCategoryProd,
  getProduct,
  getHome,
  loadBrand,
  getBrandProd,
  getBrandProduct,
  getDetails,
  googleHome,
};
