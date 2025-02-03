const categorySchema = require("../../model/categoryModel");

const loadCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const skip = (page - 1) * limit;
    const categories = await categorySchema.find().skip(skip).limit(limit);

    const totalCategories = await categorySchema.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("admin/category", { categories, currentPage: page, totalPages });
  } catch (error) {
    console.log(error);
    res.status(500).send("error");
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let existCategory = await categorySchema.findOne({ name });
    if (existCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Category name is already existed." });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "Image is required" });
    }

    const imageUrl = req.file.path;
    if (!name || !imageUrl) {
      return res
        .status(400)
        .json({ success: false, message: "Name and image are required." });
    }

    const newCategory = new categorySchema({
      name,
      imageUrl,
      description,
      productCount: 0,
    });

    await newCategory.save();
    res
      .status(201)
      .json({
        data: newCategory,
        success: true,
        message: "category added succesfully",
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "something went wrong!" });
  }
};

const categoryEdit = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    let updateData = { name, description };
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }
    const updateCategory = await categorySchema.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true }
    );
    res
      .status(200)
      .json({ data: updateCategory, message: "updated succesfully" });
  } catch (error) {
    console.log(error);
    res.status(500).send("error");
  }
};

const categoryListing = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryToUpdate = await categorySchema.findById(categoryId);
    if (!categoryToUpdate) {
      return res.status(404).send("Product not found");
    }
    const newIsListed = !categoryToUpdate.isListed;
    const updatedCategory = await categorySchema.findByIdAndUpdate(
      categoryId,
      { isListed: newIsListed },
      { new: true }
    );

    res.redirect("/admin/category");
  } catch (error) {
    console.log(error);
    res.status(500).send("error");
  }
};

module.exports = {
  addCategory,
  loadCategory,
  categoryListing,
  categoryEdit,
};
