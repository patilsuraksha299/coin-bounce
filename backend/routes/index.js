const express=require('express')
const authController = require('../controller/authController')
const blogController=require('../controller/blogController')
const commentController=require('../controller/commentController')
const router=express.Router()


const auth=require('../middlewares/auth')

//testing
router.get('/test',(req,res) => res.json({msg:"svhdh"}))

//user

//register
router.post('/register', authController.register)
//login
router.post('/login', authController.login)
//logout
router.post('/logout',auth, authController.logout)
//refresh
router.get('/refresh',authController.refresh)

//blog
//CRUD
//create
router.post('/blog',auth,blogController.create)
//read all blog
router.get('/blog/all',auth,blogController.getAll)
//read blog by id
router.get('/blog/:id' ,auth,blogController.getById)
//update
router.put('/blog',auth,blogController.update)
//delete
router.delete('/blog/:id',auth,blogController.delete)

//comment
//create comment
router.post('/comment',auth,commentController.create)

//get
router.get('/comment/:id',auth,commentController.getById)
//read comments by blog id


module.exports=router