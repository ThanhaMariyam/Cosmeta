const userSchema = require("../model/userModel");
const otpSchema = require("../model/otpModel");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bodyparser = require("body-parser");
const { log } = require("console");

function generateOTP() {
  return crypto.randomInt(1000, 9999).toString();
}
async function sendOTP(email, otp) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "thanhamariyamkv@gmail.com",
      pass: "rggy relo pirm rvvg",
    },
  });
  const mailOptions = {
    from: "thanhamariyamkv@gmail.com",
    to: email,
    subject: "Your OTP code",
    text: `Your OTP is:${otp}`,
  };
  await transporter.sendMail(mailOptions);
}

// sending otp when signingup

const postSignup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let existUser = await userSchema.findOne({ email });
    if (existUser && existUser.isVerified) {
      return res.render("user/signup", { message: "User already exist." });
    }
    await otpSchema.deleteMany({ email });
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 1000);
    await otpSchema.create({ email, code: otp, otpExpiry });
    req.session.tempUser = { username, email, password, otp, otpExpiry };
    req.session.isSignup = true;

    await sendOTP(email, otp);
    console.log("otp sent to", email);
    res.redirect("/user/otp");
  } catch (error) {
    console.error(error);
    res.render("user/signup", { message: "Something went wrong!" });
  }
};

const loadSignup = (req, res) => {
  res.render("user/signup.ejs", { message: req.session.message || "" });
  req.session.message = null;
};

const loadOtp = (req, res) => {
  res.render("user/otp", { message: req.session.message || "" });
  req.session.message = null;
};

// verify otp and register user

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const finalOtp = otp.join("");
    if (req.session.isSignup) {
      const tempUser = req.session.tempUser;
      if (!tempUser) {
        console.log("session expired");
        return res.render("user/signup", {
          message: "session Expired.Try signup again.",
        });
      }
      const otpDoc = await otpSchema.findOne({
        email: tempUser.email,
        code: finalOtp,
      });
      if (!otpDoc || otpDoc.otpExpiry < new Date()) {
        log("invalid otp");
        return res.render("user/otp", { message: "Invalid otp." });
      }
      const newUser = new userSchema({
        username: tempUser.username,
        email: tempUser.email,
        password: tempUser.password,
        isVerified: true,
      });
      await newUser.save();
      req.session.temapUser = null;
      req.session.isSignup = false;
      await otpSchema.deleteMany({ email: tempUser.email });
      console.log("user verified and registered");
      return res.send("home page");
    }
    if (req.session.isForgotPassword) {
      const email = req.session.userEmail;
      if (!email) {
        console.log("session expired");
        return res.render("user/email", { message: "Email couldn't found." });
      }
      const otpDoc = await otpSchema.findOne({ email, code: finalOtp });
      if (!otpDoc || otpDoc.otpExpiry < new Date()) {
        return res.render("user/otp", { message: "Invalid otp" });
      }
      req.session.isForgotPassword = false;
      console.log("otp verified");
      return res.redirect("/user/forgot");
    }
  } catch (error) {
    console.error(error);
    return res.render("user/otp", { message: "Something went wrong!" });
  }
};

const loadLogin = (req, res) => {
  res.render("user/login", { message: req.session.message || "" });
  req.session.mesaage = null;
};

// already registered user login

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userSchema.findOne({ email, password });
    if (!user)
      return res.render("user/login", {
        message: "Incorrect password or email!",
      });

    req.session.user = true;
    res.send("home page");
  } catch (error) {
    res.render("user/login", { message: "something went wrong" });
  }
};

const loadEmail = (req, res) => {
  res.render("user/email", { message: req.session.message || "" });
  req.session.message = null;
};

//  otp generation for forgot password

const forgotOtp = async (req, res) => {
  try {
    const { email } = req.body;
    let userExist = await userSchema.findOne({ email });
    if (!userExist) {
      console.log("user does not exist");
      return res.render("user/email", { message: "User does not exist." });
    }
    await otpSchema.deleteMany({ email });
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 1000);
    await otpSchema.create({ email, code: otp, otpExpiry });
    console.log("otp created");
    sendOTP(email, otp);

    req.session.userEmail = email;
    req.session.isForgotPassword = true;

    console.log("session email=", req.session.userEmail);
    await sendOTP(email, otp);

    res.redirect("/user/otp");
  } catch (error) {
    console.error(error);
    res.render("user/email");
  }
};

const loadResetPassword = (req, res) => {
  res.render("user/forgot", { message: req.session.message || "" });
  req.session.mesaage = null;
};

const SetNewPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const email = req.session.userEmail;
    if (!email) {
      console.log("email not found");

      return res.redirect("/user/email");
    }
    console.log(newPassword, confirmPassword);
    if (newPassword !== confirmPassword) {
      console.log("password not matching");
      return res.render("user/forgot", { message: "Password not matching." });
    }

    const user = await userSchema.findOne({ email });
    if (!user) {
      console.log("user not found");

      return res.redirect("/user/email");
    }

    user.password = newPassword;
    await user.save();
    console.log("password reset succesfully");

    res.redirect("/user/login");
  } catch (error) {
    console.log(error);
    res.render("user/forgot", { message: "Something went wrong" });
  }
};

const resendOtp = async (req, res) => {
  try {
    if (req.session.isForgotPassword) {
      const email = req.session.userEmail;
      if (!email) {
        console.log("email not found");
        return res.status(400)
      }

      const user = await userSchema.findOne({ email });
      if (!user) {
        console.log("user not found");
        return res.status(404)
      }
      await otpSchema.deleteMany({ email });
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 30 * 1000);
      await otpSchema.create({ email, code: otp, otpExpiry });
      await sendOTP(email, otp);
      console.log("new otp sent");
      return res.status(200)
    }
    
    if (req.session.isSignup) {
      const tempUser = req.session.tempUser;
      if (!tempUser || !req.session.isSignup) {
        console.log("session expired");
        return res.status(400)
      }
      const email = tempUser.email;
      const user = await userSchema.findOne({ email });
      if (user && user.isVerified) {
        console.log("user already signup");
        return res.status(400)
      }
      await otpSchema.deleteMany({ email });
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 30 * 1000);
      await otpSchema.create({ email, code: otp, otpExpiry });

      await sendOTP(email, otp);
      console.log("new otp sent");
      return res.status(200)
    }
    
    return res.status(400)
    
  } catch (error) {
    console.error(error);
    return res.status(500)
  }
};

module.exports = {
  loadSignup,
  postSignup,
  loadOtp,
  verifyOtp,
  loadLogin,
  login,
  loadEmail,
  forgotOtp,
  loadResetPassword,
  SetNewPassword,
  resendOtp,
};
