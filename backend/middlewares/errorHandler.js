const {ValidationError} = require('joi')

const errorHandler =(error ,req,res,next) => {
    let status=500;
    let data={
        message:'Intenal server error'
    }
    //if error is a validation error
    if(error instanceof ValidationError){
        status=401
        data.message=error.message
        return res.status(status).json(data)
    }

    // if error is not a validation error
    if(error.status){
        status=error.status
    }

    if(error.message){
        data.message=error.message
    }

    return res.status(status).json(data)

}

module.exports=errorHandler