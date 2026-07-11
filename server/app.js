const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173", 
}));
app.use(cookieParser()); 
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/roles", require("./routes/roleRoutes"));
app.use('/api/employees',  require('./routes/employeeRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leave', require('./routes/leaveRoutes'));
app.use('/api/permission', require('./routes/permissionRoutes'));
app.use('/api/leave-allocation', require('./routes/leaveAllocationRoutes'));
app.use('/api/salary', require('./routes/salaryRoutes'));
app.use('/api/payslips', require('./routes/payslip.routes'));
app.use('/api/passwords',require('./routes/password.routes'));
app.use('/api/attendance', require('./routes/attendanceReportRoutes'));

app.listen(5000, () => {
    console.log("Server Running on 5000");
});