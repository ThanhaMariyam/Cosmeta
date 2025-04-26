  require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const path = require("path");
const session = require("express-session");
const nocache = require("nocache");
const { loginStatus } = require("./middleware/userAuth");
const passport = require("passport");
require("./config/passportSetup");
const userRouter = require("./router/userRoute");
const adminRouter = require("./router/adminRoute");
const connectDB = require("./db/connectDb");

const cors = require("cors");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));

app.use(nocache());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/", loginStatus, userRouter);
app.use("/admin", adminRouter);
connectDB();
app.listen(3000, () => {
  console.log("running on 3000");
});
