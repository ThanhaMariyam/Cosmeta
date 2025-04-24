const userSchema = require("../../model/userModel");
const otpSchema = require("../../model/otpModel");
const walletSchema = require("../../model/walletModel");
const walletHistorySchema = require("../../model/walletHistory");
const product = require("../../model/productModal");
const categorySchema = require("../../model/categoryModel");
const brandSchema = require("../../model/brandModel");
const httpStatus = require("../../utils/httpStatus");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const saltround = 10;
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

const postSignup = async (req, res) => {
  try {
    const { username, email, password, referralCode } = req.body;
    console.log("***********", req.body);
    let existUser = await userSchema.findOne({ email });
    if (existUser && existUser.isVerified) {
      return res.render("user/signup", { message: "User already exist." });
    }
    await otpSchema.deleteMany({ email });
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 30 * 1000);
    await otpSchema.create({ email, code: otp, otpExpiry });
    req.session.tempUser = {
      username,
      email,
      password,
      referralCode: referralCode?.trim() || null,
      otp,
      otpExpiry,
    };
    req.session.isSignup = true;

    await sendOTP(email, otp);
    console.log("otp sent to", email);
    res.redirect("/otp");
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

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const finalOtp = otp.join("");

    if (req.session.isSignup) {
      const tempUser = req.session.tempUser;
      if (!tempUser) {
        console.log("Session expired");
        return res.render("user/signup", {
          message: "Session Expired. Try signing up again.",
        });
      }

      console.log("Verifying OTP for signup:", tempUser.email);

      const otpDoc = await otpSchema.findOne({
        email: tempUser.email,
        code: finalOtp,
      });

      if (!otpDoc || otpDoc.otpExpiry < new Date()) {
        console.log("Invalid OTP");
        return res.render("user/otp", { message: "Invalid OTP." });
      }

      let hashedPassword = tempUser.password
        ? await bcrypt.hash(tempUser.password, saltround)
        : null;

      const referralCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      const newUser = new userSchema({
        username: tempUser.username,
        email: tempUser.email,
        password: hashedPassword,
        isVerified: true,
        referralCode,
      });

      await newUser.save();
      console.log("User created:", newUser.email);

      let newWallet = await walletSchema.findOne({ user_id: newUser._id });
      if (!newWallet) {
        newWallet = new walletSchema({ user_id: newUser._id, balance: 0 });
        await newWallet.save();
        console.log("New wallet created with balance:", newWallet.balance);
      }

      console.log("Checking referral code:", tempUser.referralCode);

      if (tempUser.referralCode) {
        const referrer = await userSchema.findOne({
          referralCode: tempUser.referralCode,
        });

        if (referrer) {
          console.log("Valid referral by:", referrer.email);

          let referrerWallet = await walletSchema.findOne({
            user_id: referrer._id,
          });
          if (!referrerWallet) {
            referrerWallet = new walletSchema({
              user_id: referrer._id,
              balance: 0,
            });
            await referrerWallet.save();
          }

          referrerWallet.balance += 250;
          await referrerWallet.save();
          console.log(
            ` ₹250 credited to referrer ${referrer.email}, new balance: ${referrerWallet.balance}`
          );

          await walletHistorySchema.create({
            wallet_id: referrerWallet._id,
            transaction_amount: 250,
            description: `Referral bonus from ${newUser.email}`,
            transaction_type: "credited",
          });

          newWallet.balance += 100;
          await newWallet.save();
          console.log(
            ` ₹100 credited to new user ${newUser.email}, new balance: ${newWallet.balance}`
          );

          await walletHistorySchema.create({
            wallet_id: newWallet._id,
            transaction_amount: 100,
            description: "Signup bonus for using referral code",
            transaction_type: "credited",
          });
        } else {
          console.log(" Invalid referral code provided. No bonus given.");
        }
      }

      req.session.tempUser = null;
      req.session.isSignup = false;
      await otpSchema.deleteMany({ email: tempUser.email });

      req.session.user = newUser;
      console.log("Signup successful, redirecting to home.");

      req.session.save(() => res.redirect("/"));
    }

    if (req.session.isForgotPassword) {
      const email = req.session.userEmail;
      if (!email) {
        console.log("Session expired");
        return res.render("user/email", {
          message: "Email couldn't be found.",
        });
      }

      const otpDoc = await otpSchema.findOne({ email, code: finalOtp });

      if (!otpDoc || otpDoc.otpExpiry < new Date()) {
        console.log("Invalid OTP for password reset");
        return res.render("user/otp", { message: "Invalid OTP" });
      }

      req.session.isForgotPassword = false;
      console.log("OTP verified, redirecting to password reset page...");
      return res.redirect("/forgot");
    }
  } catch (error) {
    console.error("Error in OTP verification:", error);
    return res.render("user/otp", { message: "Something went wrong!" });
  }
};

const loadLogin = (req, res) => {
  res.render("user/login", { message: req.session.message || "" });
  req.session.mesaage = null;
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userSchema.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.render("user/login", {
        message: "Incorrect password or email!",
      });
    if (user.isBlocked) {
      return res.render("user/login", {
        message: "This account is blocked.",
      });
    }
    req.session.user = user;
    res.redirect("/");
  } catch (error) {
    res.render("user/login", { message: "something went wrong" });
  }
};

const loadEmail = (req, res) => {
  res.render("user/email", { message: req.session.message || "" });
  req.session.message = null;
};

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

    res.redirect("/otp");
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

      return res.redirect("/email");
    }

    if (newPassword !== confirmPassword) {
      return res.render("user/forgot", { message: "Password not matching." });
    }

    const user = await userSchema.findOne({ email });
    if (!user) {
      console.log("user not found");

      return res.redirect("/email");
    }

    user.password = await bcrypt.hash(newPassword, saltround);
    await user.save();
    console.log("password reset succesfully");

    res.redirect("/login");
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
        return res.status(400);
      }

      const user = await userSchema.findOne({ email });
      if (!user) {
        console.log("user not found");
        return res.status(404);
      }
      await otpSchema.deleteMany({ email });
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 30 * 1000);
      await otpSchema.create({ email, code: otp, otpExpiry });
      await sendOTP(email, otp);
      console.log("new otp sent");
      return res.status(200);
    }

    if (req.session.isSignup) {
      const tempUser = req.session.tempUser;
      if (!tempUser || !req.session.isSignup) {
        console.log("session expired");
        return res.status(400);
      }
      const email = tempUser.email;
      const user = await userSchema.findOne({ email });
      if (user && user.isVerified) {
        console.log("user already signup");
        return res.status(400);
      }
      await otpSchema.deleteMany({ email });
      const otp = generateOTP();
      const otpExpiry = new Date(Date.now() + 30 * 1000);
      await otpSchema.create({ email, code: otp, otpExpiry });

      await sendOTP(email, otp);
      console.log("new otp sent");
      return res.status(200);
    }

    return res.status(400);
  } catch (error) {
    console.error(error);
    return res
      .status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR)
      .render("user/500");
  }
};

const searchingProduct = async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.json([]);

    const productResults = await product
      .find({
        name: { $regex: query, $options: "i" },
        isListed: true,
      })
      .limit(5);

    const categoryResults = await categorySchema
      .find({
        name: { $regex: query, $options: "i" },
        isListed: true,
      })
      .limit(5);

    const brandResults = await brandSchema
      .find({
        name: { $regex: query, $options: "i" },
        isListed: true,
      })
      .limit(5);

    const results = [
      ...categoryResults.map((c) => ({
        type: "category",
        name: c.name,
        link: `/product?category=${encodeURIComponent(c._id)}`,
      })),
      ...brandResults.map((b) => ({
        type: "brand",
        name: b.name,
        link: `/products?brand=${encodeURIComponent(b._id)}`,
      })),
      ...productResults.map((p) => ({
        type: "product",
        name: p.name,
        link: `/productDetails/${p._id}`,
      })),
    ];

    res.json(results);
  } catch (error) {
    console.log(error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).json([]);
  }
};

const referalCode = async (req, res) => {
  try {
    const { referralCode } = req.body;
    const user = await userSchema.findOne({ referralCode });

    if (user) {
      return res.json({ exists: true });
    } else {
      return res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking referral code:", error);
    res.status(httpStatus.HttpStatus.INTERNAL_SERVER_ERROR).render("user/500");
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
  searchingProduct,
  referalCode,
};
