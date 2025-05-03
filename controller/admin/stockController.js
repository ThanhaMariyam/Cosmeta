const productSchema = require("../../model/productModal");
const httpStatus = require("../../utils/httpStatus");

const stockPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    const skip = (page - 1) * limit;
    const searchQuery = req.query.search ? req.query.search.trim() : "";

    let filter = {};
    if (searchQuery) {
      filter.name = { $regex: searchQuery, $options: "i" };
    }
    const products = await productSchema
      .find(filter)
      .sort({ stock: 1 })
      .skip(skip)
      .limit(limit);
    const totalProducts = await productSchema.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("admin/inventory", {
      products,
      currentPage: page,
      totalPages,
      searchQuery,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

const updatingStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { newStock } = req.body;

    if (newStock < 0) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ message: "Stock cannot be negative" });
    }

    const product = await productSchema.findById(productId);
    if (!product) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ message: "Product not found" });
    }

    product.stock = newStock;
    await product.save();

    res.json({ success: true, message: "Stock updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};
const stockSearch = async (req, res) => {
  try {
    const searchQuery = req.query.search?.trim() || "";
    const filter = searchQuery
      ? { name: { $regex: searchQuery, $options: "i" } }
      : {};

    const products = await productSchema.find(filter).sort({ stock: 1 });
    res.json({ products });
  } catch (error) {
    console.error(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

module.exports = {
  stockPage,
  updatingStock,
  stockSearch,
};
