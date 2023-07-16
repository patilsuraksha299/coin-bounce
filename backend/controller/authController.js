const Joi=require('joi')
const User=require('../model/user')
const bcrypt=require('bcryptjs')
const user = require('../model/user')
const RefreshToken=require('../model/token')
const UserDTO = require('../dto/user')

const JWTService=require('../services/JWTService')
const passwordPattern= /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/       //This regex will enforce these rules:

                                                                                                            //At least one upper case English letter
                                                                                                            //At least one lower case English letter
                                                                                                            //At least one digit
                                                                                                            //At least one special character
                                                                                                            //Minimum eight in length

const authController ={
    async register(req,res,next){
        //validate user input
        const userRegisterSchema=Joi.object({
            username:Joi.string().min(3).max(30).required(),
            name:Joi.string().max(30).required(),
            email:Joi.string().email().required(),
            password:Joi.string().pattern(passwordPattern).required(),
            confirmPassword:Joi.ref('password')
        })

        // if error in validation ->return error via middleware
        const {error}=userRegisterSchema.validate(req.body)

        if(error){
            return next(error)
        } 

        //if email and username are already registered
        const {username,name,email,password}=req.body

        try{
            const emailInUse=await User.exists({email})
            const usernameInUse=await User.exists({username})

            if(emailInUse){
                const error={
                    status:409,
                    message:'Email is already registered,use another email'
                }
                return next(error)
            }

            if(usernameInUse){
                const error={
                    status:409,
                    message:'username not available ,choose another username'

                }
                return next(error)
            }

        }catch(error){
            return next(error) 
        }

        //password hash

        const hashedPassword=await bcrypt.hash(password ,10)

        //store user data in database
        let accessToken;
        let refreshToken;
        let user
        try{
            const userToRegister =new User({
                username:username,
                email:email,
                name:  name,
                password:hashedPassword
            }) 
            user=await userToRegister.save()
            //generate token
            accessToken=JWTService.signAccessToken({_id:user._id},'30m')  //
            refreshToken=JWTService.signRefreshToken({_id:user._id},'60m')
            
        }catch(error){ 
            return next(error)
        }
        //store refresh token in db
        await JWTService.storeRefreshToken(refreshToken,user._id)

        //send tokens in cookie
        res.cookie('accessToken',accessToken ,{
            maxAge:1000 * 60 * 60 * 24   ,         //1 day
            httpOnly:true
        })

        res.cookie('refreshToken',refreshToken ,{
            maxAge:1000 * 60 * 60 * 24 ,           //1 day
            httpOnly:true
        })

        //response send
        const userDto=new UserDTO(user)
        return res.status(201).json({user:userDto,auth:true})     //

    },
    async login(req,res,next){
        //validate user 

        const userLoginSchema=Joi.object({
            username:Joi.string().min(3).max(30).required(),
            password:Joi.string().pattern(passwordPattern),
        })

        const {error}= userLoginSchema.validate(req.body)  

        if(error){
            return next(error)
        }

        const {username,password}=req.body  // const username=req.body.username
        let user;
        try{
            user=await User.findOne({username: username})

            if(!user){
                const error={
                    status:401,
                    message:'Invalid username'
                }
                return next(error)
            }
            // match user
            const match=await bcrypt.compare(password,user.password)
            if(!match){
                const error={
                    status:401,
                    message:'Invalid password'
                }
                return next(error)
            }

        }catch(error){
            next(error)
        }
        const accessToken=JWTService.signAccessToken({_id:user._id} ,'30m')
        const refreshToken=JWTService.signRefreshToken({_id:user._id} ,'60m')

        res.cookie('accessToken',accessToken,{
            maxAge:1000*60*60*24,
            httpOnly:true
        })

        res.cookie('refreshToken',refreshToken ,{
            maxAge:1000 * 60 * 60 * 24 ,         
            httpOnly:true
        })
        //update refresh token in database
        try{
            await RefreshToken.updateOne({_id:user._id},{token:refreshToken},{upsert:true})
                                                                        //if :it found a record-> update that record
                                                                        //else: create new record

        }catch(error){
            return next(error)
        }
        const userDto=new UserDTO(user)
          
        return res.status(200).json({user:userDto,auth:true})   //


    },

    async logout(req,res,next){
        // console.log(req)
        //delete refresh token from db
        const {refreshToken}=req.cookies

        try{
            await RefreshToken.deleteOne({token:refreshToken})
        }catch(error){
            return next(error)
        }

        //delete cookies
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')

        //response
        res.status(200).json({user:null,auth:false})
    },

    async refresh(req,res,next){
        //1. get refresh token
        //2. verify refresh token
        //3. generate new token
        //4. update db, return response

        const originalRefreshToken=req.cookies.refreshToken
        let id;
        try{
            id=JWTService.verifyRefreshToken(originalRefreshToken)._id
        }catch(e){ //user has made changes in the refresh token

            const error={
                status:401,
                message:'unauthorized'
            }
            return next(error)
        }

        try{
            const match=RefreshToken.findOne({_id:id,token:originalRefreshToken})

            if(!match){
                const error={
                    status:401,
                    message:'unauthorized'
                }
                return next(error)
            }

        }catch(e){
            return next(e)
        }

        try{
            const accessToken=JWTService.signAccessToken({_id:id},'30m')
            const refreshToken=JWTService.signRefreshToken({_id:id},'60m')

            await RefreshToken.findOne({_id:id},{token:refreshToken})

            res.cookie('accessToken',accessToken,{
                maxAge:1000*60*60*24,
                httpOnly:true
            })

            res.cookie('refreshToken',refreshToken,{
                maxAge:1000*60*60*24,
                httpOnly:true
            })

        }catch(e){
            return next(error)
        }

        const user=await User.findOne({_id:id})
        const userDto=new UserDTO(user)
        return res.status(200).json({user:userDto, auth :true})

    }
}

module.exports=authController