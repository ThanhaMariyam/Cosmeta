const passport=require('passport')
const googleStrategy=require('passport-google-oauth20').Strategy
const userSchema=require('../model/adminModel')
const user = require('../router/userRoute')

passport.serializeUser((user,done)=>{
    done(null,user.id)
})

passport.deserializeUser(async(id,done)=>{
    try{
        const user=await userSchema.findById(id)
        done(null,user)
    }
    catch(error){
        done(error,null)
    }
})
passport.use