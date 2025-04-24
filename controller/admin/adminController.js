const adminSchema = require("../../model/adminModel");

const { name } = require("ejs");

const loadLogin = (req, res) => {
  res.render("admin/adminLogin", { message: req.session.message || "" });
  req.session.message = null;
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await adminSchema.findOne({ username, password });
    if (!admin) {
      return res.render("admin/adminLogin", {
        message: "Ivalid username or password",
      });
    }
    req.session.admin = true;
    res.redirect("/admin/dashboard");
  } catch (err) {
    console.log(err);
    res.render("admin/adminLogin", { message: "something went wrong" });
  }
};

const logout = (req, res) => {
  req.session.admin = null;
  res.render("admin/adminLogin", { message: req.session.message || "" });
  req.session.message = null;
};

module.exports = {
  loadLogin,
  login,
  logout,
};
