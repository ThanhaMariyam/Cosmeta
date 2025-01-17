const express=require('express')
const admin=express.Router()
const{loadLogin,login}=require('../controller/adminController')

admin.get('/login',loadLogin)
admin.post('/login',login)

module.exports=admin