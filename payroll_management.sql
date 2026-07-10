-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 01, 2026 at 01:54 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `payroll_management`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `id` int(11) NOT NULL,
  `uname` varchar(50) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`id`, `uname`, `password`) VALUES
(1, 'admin', '$2b$10$.er.Ae16XlNyuavXXsKsh.xTIfqXmdFMcRzkmO6LZaQM5Dr.GcVwy');

-- --------------------------------------------------------

--
-- Table structure for table `bulk_upload_history`
--

CREATE TABLE `bulk_upload_history` (
  `id` int(11) NOT NULL,
  `upload_type` varchar(100) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `uploaded_by` int(11) DEFAULT NULL,
  `upload_date` datetime NOT NULL,
  `records_count` int(11) DEFAULT 0,
  `success_count` int(11) DEFAULT 0,
  `error_count` int(11) DEFAULT 0,
  `status` varchar(30) DEFAULT 'completed'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `departments`
--

CREATE TABLE `departments` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `departments`
--

INSERT INTO `departments` (`id`, `name`, `description`, `status`, `created_at`) VALUES
(1, 'ACCESSORIES', '', 'active', '2026-07-01 10:21:47'),
(2, 'SERVICE', 'SERVICE', 'active', '2026-07-01 10:27:13'),
(3, 'HR', 'HR', 'active', '2026-07-01 10:27:13'),
(4, 'SALES', 'SALES', 'active', '2026-07-01 10:27:13'),
(5, 'ADMIN', '', 'active', '2026-07-01 10:27:13'),
(6, 'BODYSHOP', '', 'active', '2026-07-01 10:27:13'),
(7, 'ACCOUNTS', '', 'active', '2026-07-01 10:27:13'),
(8, 'U-Trust', '', 'active', '2026-07-01 10:27:13'),
(9, 'PARTS', '', 'active', '2026-07-01 10:27:13'),
(10, 'MANAGEMENT', '', 'active', '2026-07-01 10:27:13'),
(11, 'SALES & SERVICE', '', 'active', '2026-07-01 10:27:13'),
(12, 'EDP', '', 'active', '2026-07-01 10:27:13'),
(13, 'ACCESSORIES', '', 'active', '2026-07-01 10:27:13'),
(14, 'RTO', '', 'active', '2026-07-01 10:27:13'),
(15, 'SSOPI', '', 'active', '2026-07-01 10:27:13'),
(16, 'MARKETING', '', 'active', '2026-07-01 10:27:13'),
(17, 'INSURANCE', '', 'active', '2026-07-01 10:27:13'),
(18, 'DRIVER', '', 'active', '2026-07-01 10:27:13');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `employee_code` varchar(20) NOT NULL,
  `pass` varchar(50) NOT NULL,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `gender` enum('male','female','other') DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `address` text DEFAULT NULL,
  `district` varchar(75) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `bank_name` varchar(100) DEFAULT NULL,
  `account_number` varchar(50) DEFAULT NULL,
  `ifsc_code` varchar(20) DEFAULT NULL,
  `branch_name` varchar(100) DEFAULT NULL,
  `aadhaar` varchar(15) DEFAULT NULL,
  `pan` varchar(15) DEFAULT NULL,
  `uan_number` varchar(25) DEFAULT NULL,
  `esic_number` varchar(25) DEFAULT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `qualification` varchar(100) DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `emergency_contact` varchar(15) DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `role_id` int(11) DEFAULT NULL,
  `manager_id` int(11) DEFAULT NULL,
  `employee_master_type` varchar(50) DEFAULT NULL,
  `cert_names` varchar(250) DEFAULT NULL,
  `cert_files` varchar(250) DEFAULT NULL,
  `caution_deposit` decimal(10,2) DEFAULT 0.00,
  `jtype` varchar(25) DEFAULT NULL,
  `joining_date` date NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `last_working_date` date DEFAULT NULL,
  `inactive_date` date DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `leave_balance` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_salary`
--

CREATE TABLE `employee_salary` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `basic_salary` decimal(10,2) NOT NULL DEFAULT 0.00,
  `hra` decimal(10,2) DEFAULT 0.00,
  `da` decimal(10,2) DEFAULT 0.00,
  `other_allowances` decimal(10,2) DEFAULT 0.00,
  `conveyance` decimal(10,2) DEFAULT 0.00,
  `medical_allowance` decimal(10,2) DEFAULT 0.00,
  `over_time` decimal(10,2) DEFAULT 0.00,
  `advance` decimal(10,2) DEFAULT NULL,
  `it_tax` decimal(10,2) DEFAULT 0.00,
  `p_tax` decimal(10,2) DEFAULT 0.00,
  `food` decimal(10,2) DEFAULT 0.00,
  `uniform` decimal(10,2) DEFAULT 0.00,
  `house_rent` decimal(10,2) DEFAULT 0.00,
  `lwe_fund` decimal(10,2) DEFAULT 0.00,
  `other_deduction` decimal(10,2) DEFAULT 0.00,
  `other_earning` decimal(10,2) DEFAULT 0.00,
  `hold_mode` enum('neft','cash') DEFAULT 'neft',
  `effective_from` date NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `pf_applicable` tinyint(1) DEFAULT 1,
  `esi_applicable` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `employee_status_changes`
--

CREATE TABLE `employee_status_changes` (
  `id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `previous_status` varchar(20) DEFAULT NULL,
  `new_status` varchar(20) NOT NULL,
  `change_reason` text DEFAULT NULL,
  `last_working_date` date DEFAULT NULL,
  `inactive_date` date DEFAULT NULL,
  `change_date` datetime NOT NULL,
  `changed_by` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `managers`
--

CREATE TABLE `managers` (
  `id` int(11) NOT NULL,
  `department_id` int(11) NOT NULL,
  `employee_id` int(11) NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` int(11) NOT NULL,
  `name` varchar(50) NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `description` varchar(200) NOT NULL DEFAULT '',
  `status` varchar(30) NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `roles`
--

INSERT INTO `roles` (`id`, `name`, `department_id`, `description`, `status`) VALUES
(1, 'ACCESSORIES COORDINATOR', 1, '', 'active');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bulk_upload_history`
--
ALTER TABLE `bulk_upload_history`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `departments`
--
ALTER TABLE `departments`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_employee_code` (`employee_code`),
  ADD KEY `fk_emp_department` (`department_id`),
  ADD KEY `fk_emp_role` (`role_id`);

--
-- Indexes for table `employee_salary`
--
ALTER TABLE `employee_salary`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_salary_employee` (`employee_id`);

--
-- Indexes for table `employee_status_changes`
--
ALTER TABLE `employee_status_changes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `managers`
--
ALTER TABLE `managers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_mgr_department` (`department_id`),
  ADD KEY `fk_mgr_employee` (`employee_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_roles_department` (`department_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `bulk_upload_history`
--
ALTER TABLE `bulk_upload_history`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `departments`
--
ALTER TABLE `departments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_salary`
--
ALTER TABLE `employee_salary`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `employee_status_changes`
--
ALTER TABLE `employee_status_changes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `managers`
--
ALTER TABLE `managers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `fk_emp_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_emp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `employee_salary`
--
ALTER TABLE `employee_salary`
  ADD CONSTRAINT `fk_salary_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `managers`
--
ALTER TABLE `managers`
  ADD CONSTRAINT `fk_mgr_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_mgr_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `roles`
--
ALTER TABLE `roles`
  ADD CONSTRAINT `fk_roles_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  date DATE NOT NULL,
  status ENUM('Present','Absent','CL','SL','OD','Holiday') NOT NULL,
  is_half_day TINYINT(1) DEFAULT 0,
  remarks VARCHAR(255) DEFAULT NULL,
  marked_by INT DEFAULT NULL,
  source ENUM('manual','bulk_upload') DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_emp_date (employee_id, date),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);


-- ============================================================
-- Leave Management Module — schema additions to payroll_management
-- Import this whole file via phpMyAdmin > Import tab
-- Order matters: leave_types must exist before leave_requests
-- (FK dependency), so it is created first.
-- ============================================================

-- ------------------------------------------------------------
-- 1. leave_types
-- `code` maps directly to attendance.status ENUM('Present','Absent','CL','SL','OD','Holiday')
-- so the HR-approve step knows exactly what to stamp on the attendance table.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` ENUM('CL','SL','OD') NOT NULL,
  `max_days_per_year` INT DEFAULT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Seed the standard types so leave_requests FK has rows to point to immediately.
-- Adjust names/codes/max_days to match what your old `leave_types` dropdown actually had.
INSERT INTO `leave_types` (`name`, `code`, `max_days_per_year`, `status`) VALUES
('Casual Leave', 'CL', 12, 'active'),
('Sick Leave', 'SL', 12, 'active'),
('On Duty', 'OD', NULL, 'active');

-- ------------------------------------------------------------
-- 2. leave_requests (unified Leave + Special Leave)
-- Employee -> Manager (Forward | Reject[final]) -> HR (Approve | Reject[LOP])
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leave_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `category` ENUM('leave','special') NOT NULL DEFAULT 'leave',
  `leave_type_id` INT NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `start_shift` ENUM('Full day','Half day') NOT NULL DEFAULT 'Full day',
  `end_shift` ENUM('Full day','Half day') NOT NULL DEFAULT 'Full day',
  `days` DECIMAL(4,1) NOT NULL,
  `reason` TEXT NOT NULL,

  -- Pending -> (Forwarded -> Approved | Rejected[HR/LOP]) | Rejected[Manager] | Cancelled
  `status` ENUM('Pending','Forwarded','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending',

  -- Who made the final rejection call, and whether it's LOP.
  -- LOP can ONLY ever be true for an hr-stage rejection, never manager-stage.
  `rejected_by_stage` ENUM('manager','hr') DEFAULT NULL,
  `is_lop` TINYINT(1) NOT NULL DEFAULT 0,

  `manager_id` INT DEFAULT NULL,        -- employees.id of assigned manager
  `manager_comments` TEXT DEFAULT NULL,
  `manager_action_at` DATETIME DEFAULT NULL,

  `hr_id` INT DEFAULT NULL,             -- employees.id of HR user who acted
  `hr_comments` TEXT DEFAULT NULL,
  `hr_action_at` DATETIME DEFAULT NULL,

  -- Whether leave_balance was already decremented at apply time,
  -- so reject/cancel logic knows whether to restore it.
  `balance_deducted` TINYINT(1) NOT NULL DEFAULT 0,

  `applied_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types` (`id`),
  FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`),
  FOREIGN KEY (`hr_id`) REFERENCES `employees` (`id`),

  INDEX `idx_employee` (`employee_id`),
  INDEX `idx_manager_status` (`manager_id`, `status`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ------------------------------------------------------------
-- 3. permission_requests (single-stage: Employee -> Manager only, final)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permission_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `employee_id` INT NOT NULL,
  `request_date` DATE NOT NULL,
  `from_time` TIME NOT NULL,
  `to_time` TIME NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  `manager_id` INT DEFAULT NULL,
  `manager_comments` TEXT DEFAULT NULL,
  `manager_action_at` DATETIME DEFAULT NULL,
  `applied_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  FOREIGN KEY (`manager_id`) REFERENCES `employees` (`id`),

  INDEX `idx_employee` (`employee_id`),
  INDEX `idx_manager_status` (`manager_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


ALTER TABLE permission_requests
  MODIFY status ENUM('Pending','Forwarded','Approved','Rejected','Cancelled') NOT NULL DEFAULT 'Pending';
 
ALTER TABLE permission_requests
  ADD COLUMN hr_comments TEXT DEFAULT NULL AFTER manager_action_at,
  ADD COLUMN hr_id INT DEFAULT NULL AFTER hr_comments,
  ADD COLUMN hr_action_at DATETIME DEFAULT NULL AFTER hr_id;


  CREATE TABLE IF NOT EXISTS salary_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_name VARCHAR(150) NOT NULL UNIQUE,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  report_data LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE employee_salary
  ADD COLUMN IF NOT EXISTS other_earning DECIMAL(10,2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS hold_mode ENUM('neft','cash') DEFAULT 'neft';


  CREATE TABLE IF NOT EXISTS holidays (
  id INT NOT NULL AUTO_INCREMENT,
  hdate DATE NOT NULL,
  days VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_hdate (hdate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS `payslips` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employee_code` VARCHAR(20) NOT NULL,
  `emp_name` VARCHAR(150) DEFAULT NULL,
  `from_date` DATE NOT NULL,
  `to_date` DATE NOT NULL,
  `payslip_month` VARCHAR(7) DEFAULT NULL,     -- 'YYYY-MM'
  `net_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payslip_data` LONGTEXT NOT NULL,            -- full JSON snapshot (basic_fixed, hra_earned, etc.)
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_emp_period` (`employee_code`, `from_date`, `to_date`),
  KEY `idx_status` (`status`),
  KEY `idx_employee_code` (`employee_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


 
ALTER TABLE employees
  ADD COLUMN force_password_change TINYINT(1) NOT NULL DEFAULT 1;
 
-- Backfill: any employee whose password still equals their employee_code
-- (plain text, per your existing storage format) needs to change it.
-- Everyone else is assumed to already have a real password, so leave them at 0.
UPDATE employees
  SET force_password_change = 0
  WHERE pass <> employee_code;
 
-- If you have bcrypt-hashed passwords mixed in (per authController.js's
-- passwordMatches() function, which checks for a "$2a$/$2b$/$2y$" prefix),
-- those are real custom passwords too — make sure they're not force_password_change = 1:
UPDATE employees
  SET force_password_change = 0
  WHERE pass REGEXP '^\\$2[aby]\\$';
 