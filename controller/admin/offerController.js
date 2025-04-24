const { name } = require("ejs");
const categorySchema = require("../../model/categoryModel");
const httpStatus = require("../../utils/httpStatus");

const getOffer = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const q = req.query.q || "";
    const regex = new RegExp(q, "i");
    const filter = q ? { name: { $regex: regex } } : {};
    const categories = await categorySchema
      .find(filter)
      .skip(skip)
      .limit(limit);
    const totalcategory = await categorySchema.countDocuments(filter);
    const totalPages = Math.ceil(totalcategory / limit);
    res.render("admin/offer.ejs", {
      categories,
      currentPage: page,
      totalPages,
      searchQuery: q,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};
const setOffer = async (req, res) => {
  try {
    console.log("Received data:", req.body);

    let { categoryId, discountPercentage } = req.body;
    if (!categoryId || !discountPercentage) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Invalid input data" });
    }

    const updatedCategory = await categorySchema.findByIdAndUpdate(
      categoryId,
      {
        $set: {
          "offer.discountPercentage": discountPercentage,
          "offer.isActive": true,
        },
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Category not found" });
    }

    console.log(
      `Updated Offer: ${updatedCategory.name} -> ${updatedCategory.offer.discountPercentage}%`
    );

    res.json({
      success: true,
      message: `Offer updated successfully! Applied discount: ${updatedCategory.offer.discountPercentage}%`,
    });
  } catch (error) {
    console.error("Error in setOffer:", error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error updating offer", error });
  }
};

const offerStatus = async (req, res) => {
  try {
    const category = await categorySchema.findById(req.params.id);
    if (!category)
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ success: false, message: "Category not found" });

    category.offer.isActive = !category.offer.isActive;
    await category.save();

    res.json({ success: true, message: "Offer status updated!" });
  } catch (error) {
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error updating offer status", error });
  }
};

const editOffer = async (req, res) => {
  try {
    const { discountPercentage } = req.body;
    await Category.findByIdAndUpdate(req.params.id, {
      "offer.discountPercentage": discountPercentage,
    });
    res.json({ success: true, message: "Offer updated successfully!" });
  } catch (error) {
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "Error updating offer", error });
  }
};

module.exports = {
  getOffer,
  setOffer,
  offerStatus,
  editOffer,
};
