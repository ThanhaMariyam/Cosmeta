const userSchema = require("../../model/userModel");
const addresSchema = require("../../model/address");
const httpStatus = require("../../utils/httpStatus");
const bcrypt = require("bcryptjs");
const saltround = 10;

const loadProfile = async (req, res) => {
  const email = req.session.user.email;
  const user = await userSchema.findOne({ email });
  res.render("user/profile", { user });
};

const saveProfile = async (req, res) => {
  const { firstname, lastname, dob } = req.body;
  console.log(req.body);
  const email = req.session.user.email;
  const user = await userSchema.findOne({ email });
  console.log(user);
  if (!user) {
    return res.redirect("/profile");
  }
  user.fullName = firstname + " " + lastname;
  user.DOB = dob;
  console.log(user);
  await user.save();
  res.redirect("/profile");
};
const loadPassword = async (req, res) => {
  const username = req.session.user.username;
  const user = await userSchema.findOne({ username });

  res.render("user/changePassword", { user, message: "" });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    console.log(currentPassword, newPassword, confirmPassword);
    const username = req.session.user.username;
    const password = req.session.user.password;
    const email = req.session.user.email;

    const user = await userSchema.findOne({ email });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.render("user/changePassword", {
        message: "Current Password is incorrect.",
        username,
      });
    }
    if (newPassword !== confirmPassword) {
      return res.render("user/changePassword", {
        message: "Password not matching.",
        username,
      });
    }
    user.password = await bcrypt.hash(newPassword, saltround);
    await user.save();
    console.log(user);

    res.redirect("/profile");
  } catch (error) {
    res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .render("user/changePassword", {
        message: "Something went wrong!",
        username,
      });
  }
};

const deleteUser = async (req, res) => {
  const email = req.session.user.email;
  const user = await userSchema.findOne({ email });
  if (!user) {
    return res.render("user/profile");
  }
  await userSchema.deleteOne({ email });
  req.session.destroy();
  console.log("user deleted");
  res.redirect("/");
};

const loadAddress = async (req, res) => {
  const username = req.session.user.username;
  const userId = req.session.user._id;

  const address = await addresSchema.find({ userId });

  const selectedAddress = req.session.selectedAddress || null;
  const fromCheckout = req.query.from === "checkout";
  res.render("user/address", {
    username,
    address,
    selectedAddress,
    fromCheckout,
  });
};

const loadAddAddress = (req, res) => {
  res.render("user/addAddress", { from: req.query.from || "" });
};

const addAddress = async (req, res) => {
  try {
    const userId = req.session.user._id;

    const {
      firstName,
      lastName,
      email,
      phone,
      city,
      streetAddress,
      pincode,
      landmark,
      state,
      country,
      isPrimary,
      from,
    } = req.body;

    if (isPrimary === "yes") {
      await addresSchema.updateMany({ userId: userId }, { isPrimary: false });
    }
    const newAddress = new addresSchema({
      userId,
      firstName,
      lastName,
      email,
      phone,
      city,
      streetAddress,
      pincode,
      landmark,
      state,
      country,
      isPrimary: isPrimary === "yes",
    });

    await newAddress.save();
    req.session.selectedAddress = newAddress._id;
    const redirectTo = from === "checkout" ? "/checkout" : "/address";
    res.redirect(redirectTo);
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.body;
    console.log(addressId);
    const address = await addresSchema.findByIdAndDelete(addressId);
    if (!address) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ message: "Address not found" });
    }
    res
      .status(httpStatus.HttpStatus.OK)
      .json({ message: "Address deleted succesfully" });
  } catch (error) {
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const editAddress = async (req, res) => {
  try {
    const {
      addressId,
      firstName,
      lastName,
      email,
      phone,
      city,
      streetAddress,
      pincode,
      landmark,
      state,
      country,
      isPrimary,
    } = req.body;
    const address = await addresSchema.findById(addressId);
    if (!address) {
      return res
        .status(httpStatus.HttpStatus.NOT_FOUND)
        .json({ message: "Address not found" });
    }
    const userId = address.userId;
    console.log("isPrimary received: ", isPrimary);
    if (isPrimary === "yes") {
      await addresSchema.updateMany({ userId }, { isPrimary: false });
    }
    const updatedAddress = await addresSchema.findByIdAndUpdate(
      addressId,
      {
        firstName,
        lastName,
        email,
        phone,
        city,
        streetAddress,
        pincode,
        landmark,
        state,
        country,
        isPrimary: isPrimary === "yes",
      },
      { new: true }
    );
    res
      .status(httpStatus.HttpStatus.OK)
      .json({
        message: "Address updated succesfully",
        address: updatedAddress,
      });
  } catch (error) {
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Logout failed");
    }
    res.redirect("/");
  });
};

module.exports = {
  loadProfile,
  logout,
  saveProfile,
  loadPassword,
  changePassword,
  deleteUser,
  loadAddress,
  loadAddAddress,
  addAddress,
  deleteAddress,
  editAddress,
};
