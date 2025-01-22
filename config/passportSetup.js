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
    clientID:"835532031732-u6a5qpqd29mlnmmtfet0mkmqvl7rr5d6.apps.googleusercontent.com",
    clientSecret:"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",
    callbackURL:"http://localhost:3000/user/auth/google/callback"

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