// npm install exceljs xlsx multer
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const employeeModel = require('../models/employeeModel');
const { DIRS } = require('../middleware/uploadEmployee');

const ok = (res, message, data = null) => res.json({ success: true, message, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, message });

// ==================== EMPLOYEES ====================
exports.getEmployees = async (req, res) => {
  try {
    const { department, role, status, search } = req.query;
    const data = await employeeModel.getEmployees({ department, role, status, search });
    ok(res, 'Employees retrieved successfully', data);
  } catch (err) {
    fail(res, 'Failed to retrieve employees: ' + err.message, 500);
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const emp = await employeeModel.getEmployeeById(req.params.id);
    if (!emp) return fail(res, 'Employee not found', 404);
    ok(res, 'Employee found', emp);
  } catch (err) {
    fail(res, 'Failed: ' + err.message, 500);
  }
};

exports.addEmployee = async (req, res) => {
  try {
    const body = req.body;
    const files = req.files || {};

    const data = { ...body };

    if (files.profile_image && files.profile_image[0]) {
      data.profile_image = files.profile_image[0].filename;
    }

    if (body.employee_master_type === 'originals_submission' && body.cert_name) {
      const certName = Array.isArray(body.cert_name) ? body.cert_name[0] : body.cert_name;
      if (certName && certName.trim() !== '') {
        data.cert_names = certName.trim();
        data.cert_files = files.cert_file_0 && files.cert_file_0[0] ? files.cert_file_0[0].filename : '';
      }
    }

    const employeeCode = await employeeModel.insertEmployee(data);
    ok(res, `Employee added successfully (${employeeCode})`);
  } catch (err) {
    fail(res, 'Failed: ' + err.message, 500);
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    const files = req.files || {};

    const data = { ...body };

    if (files.profile_image && files.profile_image[0]) {
      data.profile_image = files.profile_image[0].filename;
    }

    if (body.employee_master_type === 'originals_submission' && body.cert_name) {
      const certName = Array.isArray(body.cert_name) ? body.cert_name[0] : body.cert_name;
      if (certName && certName.trim() !== '') {
        data.cert_names = certName.trim();
        if (files.cert_file_0 && files.cert_file_0[0]) {
          data.cert_files = files.cert_file_0[0].filename;
        } else {
          data.cert_files = body.existing_cert_path_0 || '';
        }
      }
    }

    await employeeModel.updateEmployee(id, data);
    ok(res, 'Employee updated successfully');
  } catch (err) {
    fail(res, 'Failed to update employee: ' + err.message, 500);
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    await employeeModel.deleteEmployee(req.params.id);
    ok(res, 'Employee deleted successfully');
  } catch (err) {
    fail(res, 'Failed to delete employee: ' + err.message, 500);
  }
};

exports.toggleEmployeeStatus = async (req, res) => {
  try {
    const { new_status, reason, last_working_date, inactive_date } = req.body;
    const id = req.params.id;

    if (!new_status || !reason) return fail(res, 'All fields are required');
    if (new_status === 'inactive' && (!last_working_date || !inactive_date)) {
      return fail(res, 'Last working date and inactive date are required');
    }

    const changedBy = req.user?.id || null;
    await employeeModel.toggleEmployeeStatus(id, new_status, reason, last_working_date || null, inactive_date || null, changedBy);

    const action = new_status === 'active' ? 'activated' : 'deactivated';
    ok(res, `Employee ${action} successfully`);
  } catch (err) {
    fail(res, 'Failed to change status: ' + err.message, 500);
  }
};

exports.getRolesByDepartment = async (req, res) => {
  try {
    const data = await employeeModel.getRolesByDepartment(req.query.department_id);
    ok(res, 'Roles retrieved successfully', data);
  } catch (err) {
    fail(res, 'Failed to retrieve roles: ' + err.message, 500);
  }
};

// ==================== MANAGERS ====================
exports.getManagers = async (req, res) => {
  try {
    const data = await employeeModel.getManagers(req.query.department_id);
    ok(res, 'Managers retrieved successfully', data);
  } catch (err) {
    fail(res, 'Failed to retrieve managers: ' + err.message, 500);
  }
};

exports.addManager = async (req, res) => {
  try {
    const { department_id, employee_id } = req.body;
    if (!department_id || !employee_id) return fail(res, 'Department and Employee are required');
    await employeeModel.addManager(department_id, employee_id);
    ok(res, 'Manager added successfully');
  } catch (err) {
    fail(res, 'Failed to add manager: ' + err.message, 500);
  }
};

exports.deleteManager = async (req, res) => {
  try {
    await employeeModel.deleteManager(req.params.id);
    ok(res, 'Manager removed successfully');
  } catch (err) {
    fail(res, 'Failed to remove manager: ' + err.message, 500);
  }
};

// ==================== STATUS HISTORY / STATUS CHANGES ====================
exports.getEmployeeStatusHistory = async (req, res) => {
  try {
    const data = await employeeModel.getEmployeeStatusHistory();
    ok(res, 'Status history retrieved successfully', data);
  } catch (err) {
    fail(res, 'Failed to retrieve status history: ' + err.message, 500);
  }
};

exports.getStatusChangeHistory = async (req, res) => {
  try {
    const data = await employeeModel.getStatusChangeHistory();
    ok(res, 'Status change history retrieved successfully', data);
  } catch (err) {
    fail(res, 'Failed to retrieve status change history: ' + err.message, 500);
  }
};

// ==================== BULK DEDUCTION UPLOAD ====================
exports.uploadBulkDeductions = async (req, res) => {
  try {
    if (!req.file) return fail(res, 'No file uploaded');

    const savedFilename = req.file.filename;
    const savedFilepath = path.join('bulk_uploads', savedFilename);

    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const totalRecords = rows.length - 1;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const employeeCode = row[0];
      const deductions = {
        pf_applicable: String(row[1] || '').toLowerCase() === 'yes' ? 1 : 0,
        esi_applicable: String(row[2] || '').toLowerCase() === 'yes' ? 1 : 0,
        it_tax: row[3] || 0,
        p_tax: row[4] || 0,
        food: row[5] || 0,
        uniform: row[6] || 0,
        house_rent: row[7] || 0,
        lwe_fund: row[8] || 0,
        other_deduction: row[9] || 0,
      };

      const employeeId = await employeeModel.getEmployeeIdByCode(employeeCode);
      if (!employeeId) {
        errors.push(`Row ${i + 1}: Employee code ${employeeCode} not found`);
        errorCount++;
        continue;
      }

      const success = await employeeModel.updateEmployeeDeductions(employeeId, deductions);
      if (success) successCount++;
      else {
        errors.push(`Row ${i + 1}: Failed to update`);
        errorCount++;
      }
    }

    const uploadStatus = errorCount > 0 ? 'partial' : 'completed';
    await employeeModel.insertUploadHistory({
      uploadType: 'Deduction Upload',
      fileName: savedFilename,
      filePath: savedFilepath,
      uploadedBy: req.user?.id || null,
      recordsCount: totalRecords,
      successCount,
      errorCount,
      status: uploadStatus,
    });

    ok(res, `Upload completed. Success: ${successCount}, Errors: ${errorCount}`, { errors });
  } catch (err) {
    fail(res, 'Failed to process upload: ' + err.message, 500);
  }
};

exports.getUploadHistory = async (req, res) => {
  try {
    const data = await employeeModel.getUploadHistory();
    ok(res, 'Upload history retrieved successfully', data);
  } catch (err) {
    fail(res, 'Failed to retrieve upload history: ' + err.message, 500);
  }
};

exports.clearUploadHistory = async (req, res) => {
  try {
    await employeeModel.clearUploadHistory();
    ok(res, 'Upload history cleared successfully');
  } catch (err) {
    fail(res, 'Failed to clear upload history: ' + err.message, 500);
  }
};

exports.downloadTemplate = (req, res) => {
  const csv = 'Employee Code,PF Applicable,ESI Applicable,IT Tax,P Tax,Food,Uniform,House Rent,LWE Fund,Other\nEMP001,Yes,Yes,2000,200,0,0,0,0,0';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="deduction_template.csv"');
  res.send(csv);
};

// ==================== BULK EMPLOYEE ADD (full new employees) ====================

// Column order = the template we generate below. REQUIRED columns must be
// present and non-empty or the row is rejected with a specific error.
const EMP_TEMPLATE_COLUMNS = [
  { header: 'First Name', key: 'first_name', required: true },
  { header: 'Last Name', key: 'last_name', required: true },
  { header: 'Date of Birth (YYYY-MM-DD)', key: 'dob', required: true },
  { header: 'Phone', key: 'phone', required: true },
  { header: 'Emergency Contact', key: 'emergency_contact', required: true },
  { header: 'Email', key: 'email', required: true },
  { header: 'Gender (male/female/other)', key: 'gender', required: true },
  { header: 'Father Name', key: 'father_name', required: true },
  { header: 'Qualification', key: 'qualification', required: true },
  { header: 'District', key: 'district', required: true },
  { header: 'Pincode', key: 'pincode', required: true },
  { header: 'Blood Group', key: 'blood_group', required: false },
  { header: 'Address', key: 'address', required: false },
  { header: 'Aadhaar', key: 'aadhaar', required: true },
  { header: 'Bank Name', key: 'bank_name', required: true },
  { header: 'Branch Name', key: 'branch_name', required: true },
  { header: 'Account Number', key: 'account_number', required: true },
  { header: 'IFSC Code', key: 'ifsc_code', required: true },
  { header: 'PAN', key: 'pan', required: false },
  { header: 'UAN Number', key: 'uan_number', required: false },
  { header: 'ESIC Number', key: 'esic_number', required: false },
  { header: 'Joining Date (YYYY-MM-DD)', key: 'joining_date', required: true },
  { header: 'Department', key: 'department_name', required: true },
  { header: 'Role', key: 'role_name', required: true },
  { header: 'Manager Employee Code', key: 'manager_code', required: false },
  { header: 'Job Type (Permanent/Temporary)', key: 'jtype', required: false },
  { header: 'Status (active/inactive)', key: 'status', required: false },
  { header: 'Total Gross Salary', key: 'total_gross', required: true },
  { header: 'PF Applicable (Yes/No)', key: 'pf_applicable', required: false },
  { header: 'ESI Applicable (Yes/No)', key: 'esi_applicable', required: false },
  { header: 'IT Tax', key: 'it_tax', required: false },
  { header: 'P Tax', key: 'p_tax', required: false },
  { header: 'Food', key: 'food', required: false },
  { header: 'Uniform', key: 'uniform', required: false },
  { header: 'House Rent', key: 'house_rent', required: false },
  { header: 'LWF', key: 'lwf', required: false },
  { header: 'Other Deduction', key: 'other_deduction', required: false },
];

// GET /api/employees/bulk/employee-template
exports.downloadEmployeeTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('New Employees');

    sheet.addRow(EMP_TEMPLATE_COLUMNS.map((c) => c.header));
    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const col = EMP_TEMPLATE_COLUMNS[colNumber - 1];
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern', pattern: 'solid',
        fgColor: { argb: col.required ? 'FFB91C1C' : 'FF4158D0' }, // red = required, blue = optional
      };
    });

    // One example row so the format is unambiguous
    sheet.addRow([
      'Ramesh', 'Kumar', '1995-06-15', '9876543210', '9876543211', 'ramesh@example.com',
      'male', 'Suresh Kumar', 'B.Com', 'Karur', '639001', 'O+', '12 Main Street',
      '123456789012', 'State Bank of India', 'Karur Main', '1234567890123', 'SBIN0001234',
      'ABCDE1234F', '', '', '2026-01-15', 'SALES', 'ASSISTANT SALES MANAGER', '',
      'Permanent', 'active', '25000', 'Yes', 'Yes', '0', '0', '0', '0', '0', '0', '0',
    ]);

    sheet.columns.forEach((c) => (c.width = 20));
    sheet.getRow(1).height = 30;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="new_employees_template.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate template: ' + err.message });
  }
};

// Same split the modal's "Total Gross" (#ot) field does live in the browser —
// kept identical so bulk-added and manually-added employees compute salary
// the exact same way.
function splitGrossSalary(gross) {
  const medical = 1250;
  const conveyance = 1600;
  const basic = Math.round(gross * 0.40);
  const hra = Math.round(gross * 0.16);
  const special = Math.max(0, gross - basic - hra - medical - conveyance);
  return { basic, hra, medical, conveyance, special };
}

// POST /api/employees/bulk/employees  (multipart: excel_file)
exports.uploadBulkEmployees = async (req, res) => {
  try {
    if (!req.file) return fail(res, 'No file uploaded');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);
    const sheet = workbook.worksheets[0];

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const totalRecords = sheet.rowCount - 1;

    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      if (row.cellCount === 0 || !row.getCell(1).value) continue;

      const rowData = {};
      EMP_TEMPLATE_COLUMNS.forEach((col, idx) => {
        const val = row.getCell(idx + 1).value;
        rowData[col.key] = val !== null && val !== undefined ? String(val).trim() : '';
      });

      // Required-field validation
      const missing = EMP_TEMPLATE_COLUMNS.filter((c) => c.required && !rowData[c.key]);
      if (missing.length) {
        errors.push(`Row ${r}: Missing required field(s): ${missing.map((c) => c.header).join(', ')}`);
        errorCount++;
        continue;
      }

      try {
        // Resolve Department / Role names -> IDs
        const departmentId = await employeeModel.getDepartmentIdByName(rowData.department_name);
        if (!departmentId) {
          errors.push(`Row ${r}: Department "${rowData.department_name}" not found`);
          errorCount++;
          continue;
        }
        const roleId = await employeeModel.getRoleIdByNameAndDepartment(rowData.role_name, departmentId);
        if (!roleId) {
          errors.push(`Row ${r}: Role "${rowData.role_name}" not found in department "${rowData.department_name}"`);
          errorCount++;
          continue;
        }
        const managerId = rowData.manager_code
          ? await employeeModel.getManagerIdByEmployeeCode(rowData.manager_code)
          : null;
        if (rowData.manager_code && !managerId) {
          errors.push(`Row ${r}: Manager employee code "${rowData.manager_code}" not found`);
          errorCount++;
          continue;
        }

        if (await employeeModel.isEmailTaken(rowData.email)) {
          errors.push(`Row ${r}: Email "${rowData.email}" already exists`);
          errorCount++;
          continue;
        }

        const gross = parseFloat(rowData.total_gross) || 0;
        const { basic, hra, medical, conveyance, special } = splitGrossSalary(gross);

        await employeeModel.bulkInsertEmployee({
          first_name: rowData.first_name,
          last_name: rowData.last_name,
          dob: rowData.dob,
          phone: rowData.phone,
          emergency_contact: rowData.emergency_contact,
          email: rowData.email,
          gender: rowData.gender.toLowerCase(),
          father_name: rowData.father_name,
          qualification: rowData.qualification,
          district: rowData.district,
          pincode: rowData.pincode,
          blood_group: rowData.blood_group || null,
          address: rowData.address || null,
          aadhaar: rowData.aadhaar,
          bank_name: rowData.bank_name,
          branch_name: rowData.branch_name,
          account_number: rowData.account_number,
          ifsc_code: rowData.ifsc_code.toUpperCase(),
          pan: rowData.pan ? rowData.pan.toUpperCase() : null,
          uan_number: rowData.uan_number || null,
          esic_number: rowData.esic_number || null,
          joining_date: rowData.joining_date,
          department_id: departmentId,
          role_id: roleId,
          manager_id: managerId,
          jtype: rowData.jtype || 'Permanent',
          status: (rowData.status || 'active').toLowerCase(),
          employee_master_type: null,
          caution_deposit: 0,
          cert_names: null,
          cert_files: null,
          profile_image: null,
          // Salary — split from Total Gross exactly like the modal does
          basic_salary: basic,
          hra: hra,
          da: 0,
          special_allowances: special,
          medical_allowances: medical,
          conveyance: conveyance,
          ot: gross,
          pf_applicable: String(rowData.pf_applicable).toLowerCase() === 'yes' ? 1 : 0,
          esi_applicable: String(rowData.esi_applicable).toLowerCase() === 'yes' ? 1 : 0,
          it_tax: parseFloat(rowData.it_tax) || 0,
          p_tax: parseFloat(rowData.p_tax) || 0,
          food: parseFloat(rowData.food) || 0,
          uniform: parseFloat(rowData.uniform) || 0,
          rent: parseFloat(rowData.house_rent) || 0,
          lwf: parseFloat(rowData.lwf) || 0,
          other_deduction: parseFloat(rowData.other_deduction) || 0,
        });

        successCount++;
      } catch (rowErr) {
        errors.push(`Row ${r}: ${rowErr.message}`);
        errorCount++;
      }
    }

    const uploadStatus = errorCount > 0 ? 'partial' : 'completed';
    await employeeModel.insertUploadHistory({
      uploadType: 'New Employee Bulk Add',
      fileName: req.file.filename,
      filePath: path.join('bulk_uploads', req.file.filename),
      uploadedBy: req.user?.id || null,
      recordsCount: totalRecords,
      successCount,
      errorCount,
      status: uploadStatus,
    });

    ok(res, `Upload completed. Added: ${successCount}, Errors: ${errorCount}`, { errors });
  } catch (err) {
    fail(res, 'Failed to process upload: ' + err.message, 500);
  }
};

// ==================== EXCEL EXPORTS ====================
exports.exportEmployeesExcel = async (req, res) => {
  try {
    const filter = req.query.filter || 'all';
    const rows = await employeeModel.getEmployeesForExport(filter);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees Master Data');

    const headers = [
      'ID', 'Employee Code', 'First Name', 'Last Name', 'Email', 'Phone', 'Gender', 'DOB',
      'Address', 'District', 'Pincode', 'Bank Name', 'Account Number', 'IFSC Code', 'Branch Name',
      'Aadhaar', 'PAN', 'UAN Number', 'ESIC Number', 'Father Name', 'Qualification', 'Blood Group',
      'Emergency Contact', 'Department', 'Role', 'Manager', 'Job Type', 'Join Date', 'Status',
      'Leave Balance', 'Last Working Date', 'Inactive Date', 'Created At', 'Updated At',
      'Basic Salary', 'HRA', 'DA', 'Other Allowances', 'Conveyance', 'Medical Allowance', 'Over Time',
      'Total Gross Salary', 'PF Applicable', 'ESI Applicable', 'IT Tax', 'P Tax', 'Food', 'Uniform',
      'House Rent', 'LWE Fund', 'Other Deduction',
    ];
    sheet.addRow(headers);
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4158D0' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    sheet.getRow(1).height = 25;

    rows.forEach((d, idx) => {
      const totalGross =
        Number(d.basic_salary || 0) + Number(d.hra || 0) + Number(d.da || 0) +
        Number(d.other_allowances || 0) + Number(d.conveyance || 0) + Number(d.medical_allowance || 0);

      const row = sheet.addRow([
        d.id, d.employee_code, d.first_name, d.last_name, d.email, d.phone,
        d.gender ? d.gender.charAt(0).toUpperCase() + d.gender.slice(1) : '',
        d.dob, d.address, d.district, d.pincode, d.bank_name,
        String(d.account_number || ''), d.ifsc_code, d.branch_name,
        String(d.aadhaar || ''), String(d.pan || ''), String(d.uan_number || ''), String(d.esic_number || ''),
        d.father_name, d.qualification, d.blood_group, d.emergency_contact,
        d.department_name, d.role_name, d.manager_name, d.jtype, d.joining_date,
        d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : '',
        d.leave_balance, d.last_working_date || '-', d.inactive_date || '-',
        d.created_at, d.updated_at || '-',
        d.basic_salary, d.hra, d.da, d.other_allowances, d.conveyance, d.medical_allowance, d.over_time,
        totalGross,
        d.pf_applicable ? 'Yes' : 'No', d.esi_applicable ? 'Yes' : 'No',
        d.it_tax, d.p_tax, d.food, d.uniform, d.house_rent, d.lwe_fund, d.other_deduction,
      ]);

      if ((idx + 2) % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF0FF' } };
        });
      }
    });

    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = maxLen + 2;
    });
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const filename = `employees_${filter}_${Date.now()}.xlsx`;
    const filepath = path.join(DIRS.downloads, filename);
    await workbook.xlsx.writeFile(filepath);

    ok(res, 'Excel file generated successfully', {
      filepath: `uploads/downloads/${filename}`,
      filename,
    });
  } catch (err) {
    fail(res, 'Failed to generate Excel: ' + err.message, 500);
  }
};

exports.exportStatusHistoryExcel = async (req, res) => {
  try {
    const rows = await employeeModel.getStatusHistoryForExport();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employee Status History');

    const headers = ['Date', 'Employee Code', 'Employee Name', 'Department', 'Role', 'Action Type', 'Previous Status', 'New Status', 'Reason', 'Action By'];
    sheet.addRow(headers);
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4158D0' } };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    rows.forEach((d) => {
      sheet.addRow([
        d.action_date, d.employee_code, d.employee_name, d.department_name, d.role_name,
        d.action_type ? d.action_type.charAt(0).toUpperCase() + d.action_type.slice(1) : '',
        d.previous_status, d.new_status, d.reason, d.action_by_name,
      ]);
    });

    sheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = maxLen + 2;
    });

    const filename = `employee_status_history_${Date.now()}.xlsx`;
    const filepath = path.join(DIRS.downloads, filename);
    await workbook.xlsx.writeFile(filepath);

    ok(res, 'Excel file generated successfully', {
      filepath: `uploads/downloads/${filename}`,
      filename,
    });
  } catch (err) {
    fail(res, 'Failed to generate Excel: ' + err.message, 500);
  }
};