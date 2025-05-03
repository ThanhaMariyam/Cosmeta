const brandSchema = require("../../model/brandModel");
const httpStatus = require("../../utils/httpStatus");

const loadBrand = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    const searchFilter = {
      name: { $regex: new RegExp(searchQuery, "i") },
    };

    const brands = await brandSchema.find(searchFilter).sort({createdAt:-1}).skip(skip).limit(limit);
    const totalBrand = await brandSchema.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalBrand / limit);
    res.render("admin/brand", {
      brands,
      currentPage: page,
      totalPages,
      search: searchQuery,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

const addBrand = async (req, res) => {
  try {
    const { name, description, origin, status } = req.body;
    console.log(req.body);
    if (!name) {
      res.status(httpStatus.HttpStatus.BAD_REQUEST).json({success:false,message:"brand name is required"});
    }
    let existName=await brandSchema.findOne({name:{$regex:`^${name}$`, $options:'i'}})
    if(existName){
      return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({success:false,message:"Brand name already existed"})
    }

    const newBrand = new brandSchema({
      name,
      description,
      origin,
      status,
    });
    await newBrand.save();
    return res.status(httpStatus.HttpStatus.OK).json({
      success: true,
      message: "Brand added successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

const brandListing = async (req, res) => {
  try {
    const brandId = req.params.id;
    const brandToUpdate = await brandSchema.findById(brandId);
    if (!brandToUpdate) {
      return res.status(404).send("brand not found");
    }
    const newIsListed = !brandToUpdate.isListed;
    const updatedBrand = await brandSchema.findByIdAndUpdate(
      brandId,
      { isListed: newIsListed },
      { new: true }
    );

    res.redirect("/admin/brand");
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};
const brandEdit = async (req, res) => {
  try {
    const brandId = req.params.id;
    const { name, description } = req.body;
    const searchQuery = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    let existName=await brandSchema.findOne({name:{$regex:`^${name}$`, $options:'i'},_id:{$ne:brandId}})
    if(existName){
      return res.status(httpStatus.HttpStatus.BAD_REQUEST).json({success:false,message:"Brand name already existed"})
    }
    const updateBrand=await brandSchema.findByIdAndUpdate(brandId, {name,description}, { new: true });
    if(!updateBrand){
      return res.status(httpStatus.HttpStatus.NOT_FOUND).json({success:false,message:"Brand not found"})
    }
    const searchFilter = {
      name: { $regex: new RegExp(searchQuery, "i") },
    };
    const totalBrand = await brandSchema.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalBrand / limit);
    const brands = await brandSchema.find(searchFilter).skip(skip).limit(limit);
    res.status(httpStatus.HttpStatus.OK).json({
      success: true,
      message: "Brand updated successfully",
      brand: updateBrand,
      pagination: {
        totalBrand,
        totalPages,
        currentPage: page,
        searchQuery,
      },
      brands,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("admin/admin500")
  }
};

module.exports = {
  loadBrand,
  addBrand,
  brandListing,
  brandEdit,
};
