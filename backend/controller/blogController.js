const Joi=require('joi');
const fs= require('fs')
const Blog=require('../model/blog')
const { db } = require('../model/user');
const BlogDTO =require('../dto/blog')
const BlogDetailsDTO=require('../dto/blog-details')
const {BACKEND_SERVER_PATH}=require('../config/index')
const Comment=require('../model/comment')
const mongodbIdPattern = /^[0-9a-fA-F]{24}$/;
const blogController={
    async create(req,res,next){
        //  1. validate req body
        //  2. handle photo Storage
        //  3. add to db
        //  4. return response 

        const createBlogSchema =Joi.object({
            title:Joi.string().required(),
            content:Joi.string().required(),
            photo:Joi.string().required(),                   ////https://gist.github.com/ondrek/7413434
            author: Joi.string().regex(mongodbIdPattern).required()
        })
        const {error} =createBlogSchema.validate(req.body)
        if(error){
            return next(error)
        }

        const {title,author, content ,photo} =req.body
        
        // read as buffer
        const buffer=Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/,''),'base64')  
        //allot a random name
        const imagePath=`${Date.now()}-${author}.png`

        //save photo locally
        try{
            fs.writeFileSync(`storage/${imagePath}`,buffer)
        }catch(error){
            return next(error)
        }

        //save blog in db
        let newBlog;
        try{
             newBlog=new Blog({
                title,
                author,
                content,
                photoPath:`${BACKEND_SERVER_PATH}/storage/${imagePath}`
            })
            await newBlog.save()
        }catch(error){
            return next(error)
        }
        const blogDTO=new BlogDTO(newBlog)

        return res.status(201).json({blog:blogDTO})

    },
    async getAll(req,res,next){
        try{
            const blogs=await Blog.find({})
            const blogsDto=[];

            for(let i=0;i<blogs.length;i++){
                const dto=new BlogDTO(blogs[i])
                blogsDto.push(dto)
            }

            return res.status(200).json({blogs:blogsDto})
        }catch(error){
            return next(error)
        }
    },
    async getById(req,res,next){
        //validate id
        // response

        const getByIdSchema = Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required()
        })

        const {error} =getByIdSchema.validate(req.params)

        if(error){
            return next(error)
        }

        const {id}=req.params;
        let blog;
        try{
            blog = await Blog.findOne({_id:id}).populate('author')

        }catch(error){
            return next(error)
        }
        const blogDto=new BlogDetailsDTO(blog)

        return res.status(200).json({blog:blogDto})
    },
    async update(req,res,next){
        // validate
        const updateBlogSchema = Joi.object({
            title: Joi.string().required(),
            content:Joi.string().required(),
            author:Joi.string().regex(mongodbIdPattern).required(),
            blogId:Joi.string().regex(mongodbIdPattern).required(),
            photo: Joi.string()
        })
        const {error}=updateBlogSchema.validate(req.body)

        const {title,content,author,blogId,photo}=req.body

        //delete previous photo
        //save new photo
        let blog;
        try{
            blog = await Blog.findOne({_id:blogId})
        }catch(error){
            return next(error)
        }

        if((photo)){     //updating photo
            let previousPhoto=blog.photoPath; // eg: http://localhost:5000/storage/1688552780971-64a02dafdeb8cba9b676fad0.png
            previousPhoto=previousPhoto.split('/').at(-1)  // 1688552780971-64a02dafdeb8cba9b676fad0.png

            //delete photo
            fs.unlinkSync(`storage/${previousPhoto}`)
            // read as buffer
            const buffer=Buffer.from(photo.replace(/^data:image\/(png|jpg|jpeg);base64,/,''),'base64')  
            //allot a random name
            const imagePath=`${Date.now()}-${author}.png`

            //save photo locally
            try{
                fs.writeFileSync(`storage/${imagePath}`,buffer)
            }catch(error){
                return next(error)
            }
            await Blog.updateOne({_id:blogId},
                {title,content,photoPath: `${BACKEND_SERVER_PATH}/storage/${imagePath}`}
                )
        }else{
            await Blog.updateOne({_id:blogId},{title,content})
        }
        return res.status(200).json({message:'blogUpdated'})
 
    },
    async delete(req,res,next){
        //validate id
        //delete blog
        //delete comments on this blogs

        const deleteBlogSchema= Joi.object({
            id:Joi.string().regex(mongodbIdPattern).required()
        })
        const {error} =deleteBlogSchema.validate(req.body);

        const {id}=req.params;

        //delete blog
        //delete comments
        try{
            await Blog.deleteOne({_id:id})
            await Comment.deleteMany({blog:id})
        }catch(error){
            return next(error)
        }

        return res.status(200).json({message:'blog deleted'})
    },

}

module.exports=blogController