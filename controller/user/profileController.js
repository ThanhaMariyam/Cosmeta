const userSchema=require('../../model/userModel')

const loadProfile=async (req,res)=>{
    const user=await userSchema.findOne()
    res.render('user/profile',{user})

}

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Logout failed");
        }
        res.redirect("/");
    });
};



module.exports={
    loadProfile,
    logout
}