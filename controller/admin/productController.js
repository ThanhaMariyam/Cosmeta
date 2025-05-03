const product = require("../../model/productModal");
const brandSchema = require("../../model/brandModel");
const categorySchema = require("../../model/categoryModel");
const httpStatus = require("../../utils/httpStatus");
const loadProduct = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");

    const filter = q ? { name: { $regex: regex } } : {};
    const products = await product
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const brands = await brandSchema.find();
    const categories = await categorySchema.find();

    const brandsMap = {};
    brands.forEach(b => {
      brandsMap[b._id.toString()] = b.name;
    });

    const categoriesMap = {};
    categories.forEach(c => {
      categoriesMap[c._id.toString()] = c.name;
    }); 

    const productsWithNames = products.map(prod => ({
      ...prod._doc,
      brandName: brandsMap[prod.brand] || prod.brand,
      categoryName: categoriesMap[prod.category] || prod.category
    }));

    const totalProducts = await product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("admin/products", {
      products:productsWithNames,
      brands,
      categories,
      currentPage: page,
      totalPages,
      searchQuery: q,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

const liveSearchProducts = async (req, res) => {
  try {
    const keyword = req.query.q || "";
    const regex = new RegExp(keyword, "i");

    const products = await product
      .find({
        name: { $regex: regex },
      })
      .limit(10);

    res.json(products);
  } catch (error) {
    console.error("Live search error:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "Server error" });
  }
};

const loadAddProduct = async (req, res) => {
  try {
    const brands = await brandSchema.find();
    const categories = await categorySchema.find();

    res.render("admin/addProduct", {
      brands,
      categories,
      message: req.session.message || "",
    });
    req.session.message = null;
  } catch (error) {
    console.log(error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .render("admin/addProduct", {
        brands,
        categories,
        message: "Something went wrong!",
      });
  }
};

const addProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      price,
      stock,
      description,
      shades,
      colorNames,
      productOffer,
    } = req.body;

    let existName = await product.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });

    if (existName) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Product name already exist." });
    }

    if (!req.files) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Image is required." });
    }
    if (!name || !brand || !category || !price || !stock || !description) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "All fields are required." });
    }

    const images = req.files.map((item) => item.path);

    const shadeColors = shades
      ? Array.isArray(shades)
        ? shades
        : [shades]
      : [];
    const shadeNames = colorNames
      ? Array.isArray(colorNames)
        ? colorNames
        : [colorNames]
      : [];

    const maxLength = Math.max(shadeColors.length, shadeNames.length);

    const shadesData = Array.from({ length: maxLength }, (_, index) => ({
      color: shadeColors[index] || "",
      name: shadeNames[index] || "",
    }));

    const newProduct = new product({
      name,
      brand,
      category,
      price,
      stock,
      description,
      shades: shadesData,
      images,
      productOffer: productOffer || 0,
    });
    await newProduct.save();
    await brandSchema.findByIdAndUpdate(
      brand,
      { $inc: { productCount: 1 } },
      { new: true }
    );
    await categorySchema.findByIdAndUpdate(
      category,
      { $inc: { productCount: 1 } },
      { new: true }
    );

    res
      .status(httpStatus.HttpStatus.CREATED)
      .json({
        data: newProduct,
        success: true,
        message: "Product added succesfully!",
      });
  } catch (error) {
    console.log(error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Internal server error" });
  }
};
const productEditPage = async (req, res) => {
  try {
    const productId = req.params.id;
    const page = req.query.page || 1;
    const loadProduct = await product.findById(productId);
    if (!loadProduct) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ message: "product not found" });
    }

    const imageNames = loadProduct.images.map((path) => {
      return path.split("/").pop();
    });

    const brands = await brandSchema.find();
    const categories = await categorySchema.find();
    res.render("admin/editProduct", {
      product: loadProduct,
      brands,
      categories,
      imageNames,
      page,
      q: req.query.q || "",
    });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: "error" });
  }
};
const editProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const {
      name,
      brand,
      category,
      price,
      stock,
      description,
      shades,
      colorNames,
      currentImages,
      productOffer,
    } = req.body;

    if (!name || !brand || !category || !price || !stock || !description) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "All fields are required." });
    }
    let existName = await product.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' }, 
      _id: { $ne: productId } 
    });

if (existName) {
  return res
    .status(httpStatus.HttpStatus.BAD_REQUEST)
    .json({ success: false, message: "Product name already exists." });
}

    const originalProduct = await product.findById(productId);
    if (!originalProduct) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Product not found" });
    }

    const shadeColors = Array.isArray(shades) ? shades : [shades];
    const shadeNames = Array.isArray(colorNames) ? colorNames : [colorNames];

    if (shadeColors.length !== shadeNames.length) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .send("Shades and color names must match");
    }

    const shadesData = shadeColors.map((color, index) => ({
      color,
      name: shadeNames[index],
    }));

    let finalImages = Array.isArray(currentImages) ? currentImages : [];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        if (file) {
          finalImages[index] = file.path;
        }
      });
    }

    const updateData = {
      name,
      brand,
      category,
      price,
      stock,
      description,
      productOffer,
      shades: shadesData,
      images: finalImages.filter((img) => img),
    };

    if (originalProduct.brand.toString() !== brand.toString()) {
      await Promise.all([
        brandSchema.findByIdAndUpdate(originalProduct.brand, {
          $inc: { productCount: -1 },
        }),
        brandSchema.findByIdAndUpdate(brand, { $inc: { productCount: 1 } }),
      ]);
    }

    if (originalProduct.category.toString() !== category.toString()) {
      await Promise.all([
        categorySchema.findByIdAndUpdate(originalProduct.category, {
          $inc: { productCount: -1 },
        }),
        categorySchema.findByIdAndUpdate(category, {
          $inc: { productCount: 1 },
        }),
      ]);
    }

    const updatedProduct = await product.findByIdAndUpdate(
      productId,
      updateData,

      { new: true }
    );

    res.status(httpStatus.HttpStatus.OK).json({
      data: updatedProduct,
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error(error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "something went wrong!" });
  }
};

const productListing = async (req, res) => {
  try {
    const productId = req.params.id;
    const productToUpdate = await product.findById(productId);
    if (!productToUpdate) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .send("Product not found");
    }
    const newIsListed = !productToUpdate.isListed;
    const updatedProduct = await product.findByIdAndUpdate(
      productId,
      { isListed: newIsListed },
      { new: true }
    );

    res.redirect("/admin/products");
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

module.exports = {
  loadProduct,
  liveSearchProducts,
  loadAddProduct,
  addProduct,
  productEditPage,
  editProduct,
  productListing,
};
