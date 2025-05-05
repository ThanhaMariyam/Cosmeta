const crypto=require('crypto')
const passport=require('passport')
const googleStrategy=require('passport-google-oauth20').Strategy
const userSchema=require('../model/userModel')
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
passport.use(new googleStrategy({
    clientID:process.env.GoogleAuth_Id,
    clientSecret:process.env.GoogleAuth_secret,
    callbackURL:"/user/auth/google/callback"

},async(accessToken, refreshToken, profile, done)=>{
    try{
        const existUser=await userSchema.findOne({email:profile.emails[0].value})
        if(existUser){
             if(!existUser.googleId){
                existUser.googleId=profile.id
                existUser.isVerified=true
                await existUser.save()
             }
            return done(null,existUser)

        }
        const newUser=new userSchema({
            username:profile.displayName,
            email:profile.emails[0].value,
            password:'google-auth-'+crypto.randomBytes(16).toString('hex'),
            isVerified:true,
            googleId:profile.id
        })

        await newUser.save()
        done(null, newUser)
    }
    catch(error){
        done(error,null)
    }
}
))