const jwt=require("jsonwebtoken");

exports.generateToken=(user)=>{

return jwt.sign(

{

id:user.id,

role:user.role,

employee_code:user.employee_code||null

},

process.env.JWT_SECRET,

{

expiresIn:"8h"

}

);

};

exports.verifyToken=(token)=>{

return jwt.verify(

token,

process.env.JWT_SECRET

);

};