import * as yup from 'yup'

const passwordPattern= /^(?=.*?[A-Z])(?=(.*[a-z]){1,})(?=(.*[\d]){1,})(?=(.*[\W]){1,})(?!.*\s).{8,}$/ 

const errorMessage='use uppercase ,lowercase and digits'

const signupSchema=yup.object().shape({
    name:yup.string().max(30).required('name is required'),
    username:yup.string().min(5).max(30).required('username is required'),
    email:yup.string().email('enter a valid email').required('email is required'),
    password:yup.string().min(8).max(25).matches(passwordPattern,{message: errorMessage }).required('password is required'),
    confirmPassword:yup.string().oneOf([yup.ref('password')], 'password must match ').required('password is required')
})

export default signupSchema