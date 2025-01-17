const express=require("express")
const user=express.Router()
const {loadSignup,postSignup,loadOtp,verifyOtp,loadLogin,login,loadEmail,forgotOtp,loadResetPassword,SetNewPassword,resendOtp}=require('../controller/userController')

user.get('/signup',loadSignup)
user.post('/signup',postSignup)

user.get('/login',loadLogin)
user.post('/login',login)


user.get('/otp',loadOtp)
user.post('/otp',verifyOtp)



user.get('/forgot',loadResetPassword)
user.post('/forgot',SetNewPassword)

user.get('/email',loadEmail)
user.post('/email',forgotOtp)

user.post('/resend-otp',resendOtp)

module.exports=user