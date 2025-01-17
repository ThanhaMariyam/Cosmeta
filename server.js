const express=require("express")
const app=express()
const ejs=require("ejs")
const path=require("path")
const userRouter=require("./router/userRoute")
const adminRouter=require("./router/adminRoute")
const connectDB=require('./db/connectDb')
const session = require("express-session")
const cors = require('cors')
app.set("view engine","ejs")
app.set("views",path.join(__dirname,"views"))

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge:600000}
  }))

  app.use(cors({
    origin: 'http://localhost:3000',  // Your frontend URL
    credentials: true
}));



app.use(express.static('public'))

app.use(express.urlencoded({extended:true}))
app.use(express.json())
app.use("/user",userRouter)
app.use("/admin",adminRouter)
connectDB()
app.listen(3000,()=>{
    console.log("running on 3000")
})