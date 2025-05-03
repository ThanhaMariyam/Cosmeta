const categorySchema = require("../../model/categoryModel");
const httpStatus = require("../../utils/httpStatus");

const loadCategory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const searchQuery = {
      name: { $regex: search, $options: "i" },
    };
    const categories = await categorySchema
      .find(searchQuery)
      .sort({createdAt:-1})
      .skip(skip)
      .limit(limit);

    const totalCategories = await categorySchema.countDocuments(searchQuery);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("admin/category", {
      categories,
      currentPage: page,
      totalPages,
      search,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    let existCategory = await categorySchema.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' } 
    });
    if (existCategory) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Category name is already existed." });
    }

    if (!req.file) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Image is required" });
    }

    const imageUrl = req.file.path;
    if (!name || !imageUrl) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Name and image are required." });
    }

    const newCategory = new categorySchema({
      name,
      imageUrl,
      description,
      productCount: 0,
    });

    await newCategory.save();
    res.status(httpStatus.HttpStatus.CREATED).json({
      data: newCategory,
      success: true,
      message: "category added succesfully",
    });
  } catch (error) {
    console.log(error);
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: "something went wrong!" });
  }
};

const categoryEdit = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;
    let updateData = { name, description };

    let existCategory = await categorySchema.findOne({ 
      name: { $regex: `^${name}$`, $options: 'i' }, 
      _id: { $ne: categoryId } 
    });
    
    
    if (existCategory) {
      return res
        .status(httpStatus.HttpStatus.BAD_REQUEST)
        .json({ success: false, message: "Category name is already existed." });
    }
    if (req.file) {
      updateData.imageUrl = req.file.path;
    }
    const updateCategory = await categorySchema.findByIdAndUpdate(
      categoryId,
      updateData,
      { new: true }
    );
    res
      .status(httpStatus.HttpStatus.OK)
      .json({ data: updateCategory, message: "updated succesfully" });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

const categoryListing = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const categoryToUpdate = await categorySchema.findById(categoryId);
    if (!categoryToUpdate) {
      return res.status(httpStatus.HttpStatus.NOT_FOUND).render("user/404");
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
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

module.exports = {
  addCategory,
  loadCategory,
  categoryListing,
  categoryEdit,
};
