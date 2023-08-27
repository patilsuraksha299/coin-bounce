import * as yup from 'yup'   //defines rules of validation

const passwordPattern= /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/ 

const errorMessage='use uppercase ,lowercase and digits'

const loginSchema = yup.object().shape({
    username:yup.string().min(5).max(30).required('username is required'),
    password: yup.string().min(8).max(25).matches(passwordPattern,{message:errorMessage}).required()
})

export default loginSchema