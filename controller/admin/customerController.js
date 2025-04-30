const userSchema = require("../../model/userModel");
const brandSchema = require("../../model/brandModel");
const httpStatus = require("../../utils/httpStatus");
const loadUser = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const user = await userSchema
      .find(query)
      .sort({ username: 1 })
      .skip(skip)
      .limit(limit);
    const totalUser = await userSchema.countDocuments(query);
    const totalPages = Math.ceil(totalUser / limit);
    res.render("admin/user", {
      users: user,
      currentPage: page,
      totalPages,
      searchQuery: search,
    });
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const blockUser = async (req, res) => {
  try {
    console.log(req.session.user)
    const userId = req.params.id;
    const { page = 1, search = "" } = req.query;
    await userSchema.findByIdAndUpdate(userId, { isBlocked: true });
    req.session.user._id=null
    res.redirect(
      `/admin/user?page=${page}&search=${encodeURIComponent(search)}`
    );
    
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const unblockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, search = "" } = req.query;
    await userSchema.findByIdAndUpdate(userId, { isBlocked: false });
    res.redirect(
      `/admin/user?page=${page}&search=${encodeURIComponent(search)}`
    );
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

module.exports = {
  loadUser,
  blockUser,
  unblockUser,
};
