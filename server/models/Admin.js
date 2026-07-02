const db=require("../config/db");

exports.findAdmin = async(employeeId)=>{

const [rows]=await db.query(

"SELECT * FROM admin WHERE uname=?",

[employeeId]

);

return rows[0];

}