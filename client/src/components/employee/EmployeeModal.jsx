import React, { useEffect, useRef, useState, useCallback } from 'react';
import Swal from 'sweetalert2';
import employeeService, { FILE_BASE } from '../../services/employeeService';
import defaultProfile from "../../assets/images/default-profile.png";

const STEP_LABELS = ['Basic Details', 'KYC Details', 'Job Info', 'Salary Info'];
const STEP_ICONS = ['fa-user', 'fa-university', 'fa-briefcase', 'fa-rupee-sign'];

// Full list of Indian states/UTs mapped to their districts. State drives the
// District dropdown: pick a State first, then District options populate.
const STATE_DISTRICTS = {
  "Andaman and Nicobar Islands": ["Nicobar", "North and Middle Andaman", "South Andaman"],
  "Andhra Pradesh": ["Alluri Sitharama Raju", "Anakapalli", "Anantapur", "Annamayya", "Bapatla", "Chittoor", "East Godavari", "Eluru", "Guntur", "Kakinada", "Konaseema", "Krishna", "Kurnool", "Nandamuri Taraka Rama Rao", "Nandyal", "Palnadu", "Parvathipuram Manyam", "Prakasam", "Sri Potti Sriramulu Nellore", "Sri SathyaYSR", "Srikakulam", "Tirupati", "Visakhapatnam", "Vizianagaram", "West Godavari"],
  "Arunachal Pradesh": ["Anjaw", "Changlang", "East Kameng", "East Siang", "Itanagar City Complex", "Kamle", "Kra Daadi", "Kurung Kumey", "Lepa Rada", "Lohit", "Longding", "Lower Dibang Valley", "Lower Siang", "Lower Subansiri", "Namsai", "Pakke-Kessang", "Papum Pare", "Shi Yomi", "Siang", "Tawang", "Tirap", "Upper Dibang Valley", "Upper Siang", "Upper Subansiri", "West Kameng", "West Siang"],
  "Assam": ["Bajali", "Baksa", "Barpeta", "Biswanath", "Bongaigaon", "Cachar", "Charaideo", "Chirang", "Darrang", "Dhemaji", "Dhubri", "Dibrugarh", "Dima Hasao", "Goalpara", "Golaghat", "Hailakandi", "Hojai", "Jorhat", "Kamrup", "Kamrup Metropolitan", "Karbi Anglong", "Karimganj", "Kokrajhar", "Lakhimpur", "Majuli", "Morigaon", "Nagaon", "Nalbari", "Sivasagar", "Sonitpur", "South Salmara Mankachar", "Tamulpur", "Tinsukia", "Udalguri", "West Karbi Anglong"],
  "Bihar": ["Araria", "Arwal", "Aurangabad", "Banka", "Begusarai", "Bhagalpur", "Bhojpur", "Buxar", "Darbhanga", "East Champaran", "Gaya", "Gopalganj", "Jamui", "Jehanabad", "Kaimur", "Katihar", "Khagaria", "Kishanganj", "Lakhisarai", "Madhepura", "Madhubani", "Munger", "Muzaffarpur", "Nalanda", "Nawada", "Patna", "Purnia", "Rohtas", "Saharsa", "Samastipur", "Saran", "Sheikhpura", "Sheohar", "Sitamarhi", "Siwan", "Supaul", "Vaishali", "West Champaran"],
  "Chandigarh": ["Chandigarh"],
  "Chhattisgarh": ["Balod", "Baloda Bazar-Bhatapara", "Balrampur", "Bastar", "Bemetara", "Bijapur", "Bilaspur", "Dantewada", "Dhamtari", "Durg", "Gariaband", "Gaurella-Pendra-Marwahi", "Janjgir-Champa", "Jashpur", "Kabirdham", "Kanker", "Khairagarh-Chhuikhadan-Gandai", "Kondagaon", "Korba", "Korea", "Mahasamund", "Manendragarh-Chirmiri-Bharatpur", "Mohla Manpur", "Mungeli", "Narayanpur", "Raigarh", "Raipur", "Rajnandgaon", "Sarangarh-Bilaigarh", "Shakti", "Sukma", "Surajpur", "Surguja"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Dadra and Nagar Haveli", "Daman", "Diu"],
  "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "North East Delhi", "North West Delhi", "Shahdara district", "South Delhi", "South East Delhi", "South West Delhi", "West Delhi"],
  "Goa": ["North Goa", "South Goa"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch", "Bhavnagar", "Botad", "Chhota Udaipur", "Dahod", "Dang", "Devbhumi Dwarka", "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch", "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal", "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar", "Tapi", "Vadodara", "Valsad"],
  "Haryana": ["Ambala", "Bhiwani", "Charkhi Dadri", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jhajjar", "Jind", "Kaithal", "Karnal", "Kurukshetra", "Mahendragarh", "Nuh", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Yamunanagar"],
  "Himachal Pradesh": ["Bilaspur", "Chamba", "Hamirpur", "Kangra", "Kinnaur", "Kullu", "Lahaul and Spiti", "Mandi", "Shimla", "Sirmaur", "Solan", "Una"],
  "Jammu and Kashmir": ["Anantnag", "Bandipore", "Baramulla", "Budgam", "Doda", "Ganderbal", "Jammu", "Kathua", "Kishtwar", "Kulgam", "Kupwara", "Poonch", "Pulwama", "Rajouri", "Ramban", "Reasi", "Samba", "Shopian", "Srinagar", "Udhampur"],
  "Jharkhand": ["Bokaro", "Chatra", "Deoghar", "Dhanbad", "Dumka", "East Singhbhum", "Garhwa", "Giridih", "Godda", "Gumla", "Hazaribag", "Jamtara", "Khunti", "Koderma", "Latehar", "Lohardaga", "Pakur", "Palamu", "Ramgarh", "Ranchi", "Sahibganj", "Seraikela-Kharsawan", "Simdega", "West Singhbhum"],
  "Karnataka": ["Bagalkot", "Bangalore Rural", "Bangalore Urban", "Belgaum", "Bellary", "Bidar", "Chamarajanagara", "Chikkaballapur", "Chikmagalur", "Chitradurga", "Dakshina Kannada", "Davanagere", "Dharwad", "Gadag", "Gulbarga", "Hassan", "Haveri", "Kodagu", "Kolar", "Koppala", "Mandya", "Mysore", "Raichur", "Ramanagara", "Shimoga", "Tumakuru", "Udupi", "Uttara Kannada", "Vijayanagara", "Vijayapura", "Yadgir"],
  "Kerala": ["Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad", "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"],
  "Ladakh": ["Kargil", "Leh"],
  "Lakshadweep": ["Lakshadweep"],
  "Madhya Pradesh": ["Agar Malwa", "Alirajpur", "Anuppur", "Ashoknagar", "Balaghat", "Barwani", "Betul", "Bhind", "Bhopal", "Burhanpur", "Chachoda", "Chhatarpur", "Chhindwara", "Damoh", "Datia", "Dewas", "Dhar", "Dindori", "Guna", "Gwalior", "Harda", "Indore", "Jabalpur", "Jhabua", "Katni", "Khandwa (East Nimar)", "Khargone (West Nimar)", "Maihar", "Mandla", "Mandsaur", "Morena", "Nagda", "Narmadapuram", "Narsinghpur", "Neemuch", "Niwari", "Panna", "Raisen", "Rajgarh", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Seoni", "Shahdol", "Shajapur", "Sheopur", "Shivpuri", "Sidhi", "Singrauli", "Tikamgarh", "Ujjain", "Umaria", "Vidisha"],
  "Maharashtra": ["Ahmednagar", "Akola", "Amravati", "Aurangabad", "Beed", "Bhandara", "Buldhana", "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai suburban", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli", "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal"],
  "Manipur": ["Bishnupur", "Chandel", "Churachandpur", "Imphal East", "Imphal West", "Jiribam", "Kakching", "Kamjong", "Kangpokpi", "Noney", "Pherzawl", "Senapati", "Tamenglong", "Tengnoupal", "Thoubal", "Ukhrul"],
  "Meghalaya": ["East Garo Hills", "East Jaintia Hills", "East Khasi Hills", "Eastern West Khasi Hills district", "North Garo Hills", "Ri Bhoi", "South Garo Hills", "South West Garo Hills", "South West Khasi Hills", "West Garo Hills", "West Jaintia Hills", "West Khasi Hills"],
  "Mizoram": ["Aizawl", "Champhai", "Hnahthial", "Khawzawl", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Saitual", "Serchhip"],
  "Nagaland": ["Ch\u00fcmoukedima", "Dimapur", "Kiphire", "Kohima", "Longleng", "Mokokchung", "Mon", "Niuland", "Noklak", "Peren", "Phek", "Shamator", "Tseminy\u00fc", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balangir", "Balasore", "Bargarh (Baragarh)", "Bhadrak", "Boudh (Bauda)", "Cuttack", "Debagarh (Deogarh)", "Dhenkanal", "Gajapati", "Ganjam", "Jagatsinghpur", "Jajpur", "Jharsuguda", "Kalahandi", "Kandhamal", "Kendrapara", "Kendujhar", "Khordha", "Koraput", "Malkangiri", "Mayurbhanj", "Nabarangpur", "Nayagarh", "Nuapada", "Puri", "Rayagada", "Sambalpur", "Subarnapur (Sonepur)", "Sundargarh"],
  "Puducherry": ["Karaikal", "Mah\u00e9", "Puducherry", "Yanam"],
  "Punjab": ["Amritsar", "Barnala", "Bathinda", "Faridkot", "Fatehgarh Sahib", "Fazilka", "Firozpur", "Gurdaspur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Ludhiana", "Malerkotla", "Mansa", "Moga", "Pathankot", "Patiala", "Rupnagar", "Sahibzada Ajit Singh Nagar", "Sangrur", "Shahid Bhagat Singh Nagar", "Sri Muktsar Sahib", "Tarn Taran"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dausa", "Dholpur", "Dungarpur", "Hanumangarh", "Jaipur", "Jaisalmer", "Jalore", "Jhalawar", "Jhunjhunu", "Jodhpur", "Karauli", "Kota", "Nagaur", "Pali", "Pratapgarh", "Rajsamand", "Sawai Madhopur", "Sikar", "Sirohi", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["East Sikkim", "North Sikkim", "Pakyong", "Soreng", "South Sikkim", "West Sikkim"],
  "Tamil Nadu": ["Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupattur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"],
  "Telangana": ["Adilabad", "Bhadradri Kothagudem", "Hanamkonda", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally", "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahbubnagar", "Mancherial", "Medak", "Medchal\u2013Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli", "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri"],
  "Tripura": ["Dhalai", "Gomati", "Khowai", "North Tripura", "Sepahijala", "South Tripura", "Unakoti", "West Tripura"],
  "Uttar Pradesh": ["Agra", "Aligarh", "Allahabad", "Ambedkar Nagar", "Amethi", "Amroha", "Auraiya", "Azamgarh", "Bagpat", "Bahraich", "Ballia", "Balrampur", "Banda", "Barabanki", "Bareilly", "Basti", "Bhadohi", "Bijnor", "Budaun", "Bulandshahr", "Chandauli", "Chitrakoot", "Deoria", "Etah", "Etawah", "Faizabad", "Farrukhabad", "Fatehpur", "Firozabad", "Gautam Buddha Nagar", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Hamirpur", "Hapur", "Hardoi", "Hathras", "Jalaun", "Jaunpur", "Jhansi", "Kannauj", "Kanpur Dehat", "Kanpur Nagar", "Kasganj", "Kaushambi", "Kushinagar", "Lakhimpur Kheri", "Lalitpur", "Lucknow", "Maharajganj", "Mahoba", "Mainpuri", "Mathura", "Mau", "Meerut", "Mirzapur", "Moradabad", "Muzaffarnagar", "Pilibhit", "Pratapgarh", "Raebareli", "Rampur", "Saharanpur", "Sambhal", "Sant Kabir Nagar", "Shahjahanpur", "Shamli", "Shravasti", "Siddharthnagar", "Sitapur", "Sonbhadra", "Sultanpur", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Bageshwar", "Chamoli", "Champawat", "Dehradun", "Didihat", "Haridwar", "Kotdwar", "Nainital", "Pauri Garhwal", "Pithoragarh", "Ranikhet", "Rudraprayag", "Tehri Garhwal", "Udham Singh Nagar", "Uttarkashi", "Yamunotri"],
  "West Bengal": ["Alipurduar", "Bankura", "Birbhum", "Cooch Behar", "Dakshin Dinajpur", "Darjeeling", "Hooghly", "Howrah", "Jalpaiguri", "Jhargram", "Kalimpong", "Kolkata", "Maldah", "Murshidabad", "Nadia", "North 24 Parganas", "Paschim Bardhaman", "Paschim Medinipur", "Purba Bardhaman", "Purba Medinipur", "Purulia", "South 24 Parganas", "Uttar Dinajpur"],
};

const emptyForm = {
  employeeId: '', employeeCode: '',
  firstName: '', lastName: '', dob: '', phone: '', emergencyContact: '', email: '',
  gender: '', blood_group: '', fatherName: '', qualification: '', address: '', district: '', state: '', pincode: '', pfNumber: '',
  aadhaar: '', pan: '', bankName: '', branchName: '', accountNumber: '', confirmAccountNumber: '', ifscCode: '',
  uanNumber: '', esicNumber: '',
  joinDate: '', empStatus: 'active', jtype: 'Permanent', department: '', role: '', manager: '',
  employeeMaster: '', cautionDeposit: '', certName: '', existingCertPath: '',
  basicSalary: '', hra: '', da: '', specialAllowances: '', mAllowances: '', conveyance: '', ot: '',
  pfApplicable: true, esiApplicable: true,
  ittax: '', ptax: '', food: '', uniform: '', rent: '', lwf: '', other_deduction: '',
};

export default function EmployeeModal({ employeeId, departments, onClose, onSaved }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [profilePreview, setProfilePreview] = useState('defaultProfile');
  const [profileFile, setProfileFile] = useState(null);
  const [certFile, setCertFile] = useState(null);
  const [certPreview, setCertPreview] = useState(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showConfirmAccount, setShowConfirmAccount] = useState(false);
  const [accMatch, setAccMatch] = useState(null); // null | true | false
  const [saving, setSaving] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certModalSrc, setCertModalSrc] = useState('');
  const previousStatusRef = useRef('active');

  const isEdit = !!employeeId;

  useEffect(() => {
    employeeService.getManagers().then((res) => { if (res.success) setManagers(res.data); });
  }, []);

  useEffect(() => {
    if (form.department) {
      employeeService.getRolesByDepartment(form.department).then((res) => {
        if (res.success) setRoles(res.data);
      });
    } else {
      setRoles([]);
    }
  }, [form.department]);

  useEffect(() => {
    if (!isEdit) return;
    employeeService.getEmployee(employeeId).then((res) => {
      if (!res.success) { Swal.fire('Error', 'Employee not found', 'error'); return; }
      const emp = res.data;
      previousStatusRef.current = emp.status;
      setForm({
        employeeId: emp.id, employeeCode: emp.employee_code,
        firstName: emp.first_name || '', lastName: emp.last_name || '', dob: emp.dob ? emp.dob.substring(0, 10) : '',
        phone: emp.phone || '', emergencyContact: emp.emergency_contact || '', email: emp.email || '',
        gender: emp.gender || '', blood_group: emp.blood_group || '', fatherName: emp.father_name || '',
        qualification: emp.qualification || '', address: emp.address || '', district: emp.district || '',
        state: emp.state || '', pincode: emp.pincode || '', pfNumber: emp.pf_number || '',
        aadhaar: emp.aadhaar || '', pan: emp.pan || '', bankName: emp.bank_name || '', branchName: emp.branch_name || '',
        accountNumber: emp.account_number || '', confirmAccountNumber: emp.account_number || '', ifscCode: emp.ifsc_code || '',
        uanNumber: emp.uan_number || '', esicNumber: emp.esic_number || '',
        joinDate: emp.joining_date ? emp.joining_date.substring(0, 10) : '', empStatus: emp.status || 'active',
        jtype: emp.jtype || 'Permanent', department: emp.department_id || '', role: emp.role_id || '', manager: emp.manager_id || '',
        employeeMaster: emp.employee_master_type || '',
        cautionDeposit: emp.caution_deposit || '',
        certName: emp.documents?.[0]?.document_name || '',
        existingCertPath: emp.documents?.[0]?.file_path || '',
        basicSalary: emp.basic_salary || '', hra: emp.hra || '', da: emp.da || '',
        specialAllowances: emp.other_allowances || '', mAllowances: emp.medical_allowance || '', conveyance: emp.conveyance || '',
        ot: emp.over_time || '',
        pfApplicable: emp.pf_applicable == 1, esiApplicable: emp.esi_applicable == 1,
        ittax: emp.it_tax || '', ptax: emp.p_tax || '', food: emp.food || '', uniform: emp.uniform || '',
        rent: emp.house_rent || '', lwf: emp.lwe_fund || '', other_deduction: emp.other_deduction || '',
      });
      setProfilePreview(emp.profile_image ? `${FILE_BASE}/uploads/profiles/${emp.profile_image}` : '/assets/images/default-profile.png');
      // role list depends on department effect above; set role after roles load
      setTimeout(() => setForm((f) => ({ ...f, role: emp.role_id || '' })), 300);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const setErr = (key, msg) => setErrors((e) => ({ ...e, [key]: msg }));
  const handleStateChange = (value) => {
    setForm((f) => ({ ...f, state: value, district: '' }));
  };

  const handleProfileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCertChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire('Error', 'File size exceeds 2MB. Please choose a smaller file.', 'error');
      e.target.value = '';
      return;
    }
    setCertFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setCertPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const viewCert = () => {
    if (certFile) {
      const reader = new FileReader();
      reader.onload = (e) => { setCertModalSrc(e.target.result); setCertModalOpen(true); };
      reader.readAsDataURL(certFile);
      return;
    }
    if (form.existingCertPath) {
      setCertModalSrc(`${FILE_BASE}/uploads/orginal_certificate/${form.existingCertPath}`);
      setCertModalOpen(true);
      return;
    }
    Swal.fire('No Certificate', 'No certificate image has been uploaded yet.', 'info');
  };

  useEffect(() => {
    if (!form.confirmAccountNumber) { setAccMatch(null); return; }
    setAccMatch(form.accountNumber === form.confirmAccountNumber);
  }, [form.accountNumber, form.confirmAccountNumber]);

  const validateStep = useCallback((s) => {
    const newErrors = {};
    let valid = true;
    const req = (key, msg = 'This field is required.') => {
      if (!String(form[key] || '').trim()) { newErrors[key] = msg; valid = false; }
    };

    if (s === 1) {
      ['firstName', 'lastName', 'dob', 'phone', 'emergencyContact', 'email', 'gender', 'fatherName', 'qualification'].forEach((f) => req(f));
      if (form.phone && !/^\d{10}$/.test(form.phone)) { newErrors.phone = 'Enter valid 10-digit number.'; valid = false; }
      if (form.emergencyContact && !/^\d{10}$/.test(form.emergencyContact)) { newErrors.emergencyContact = 'Enter valid 10-digit number.'; valid = false; }
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { newErrors.email = 'Enter valid email address.'; valid = false; }
      req('district'); req('state'); req('pincode');
    }
    if (s === 2) {
      ['aadhaar', 'bankName', 'branchName', 'accountNumber', 'confirmAccountNumber', 'ifscCode'].forEach((f) => req(f));
      if (form.aadhaar && !/^\d{12}$/.test(form.aadhaar)) { newErrors.aadhaar = 'Aadhaar must be 12 digits.'; valid = false; }
      const pan = (form.pan || '').toUpperCase();
      if (pan && pan !== 'NULL' && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) { newErrors.pan = 'Enter valid PAN (e.g. ABCDE1234F)'; valid = false; }
      const ifsc = (form.ifscCode || '').toUpperCase();
      if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { newErrors.ifscCode = 'Enter valid IFSC code.'; valid = false; }
      if (form.accountNumber && form.confirmAccountNumber && form.accountNumber !== form.confirmAccountNumber) {
        newErrors.confirmAccountNumber = 'Account numbers do not match.'; valid = false;
      }
    }
    if (s === 3) {
      req('joinDate'); req('department'); req('role');
    }
    setErrors(newErrors);
    return valid;
  }, [form]);

  const handleNext = () => { if (validateStep(step)) setStep((s) => Math.min(4, s + 1)); };
  const handlePrev = () => setStep((s) => Math.max(1, s - 1));

  const handleDobChange = (value) => {
    setField('dob', value);
    if (!value) return;
    const dobDate = new Date(value);
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
    if (age < 19) {
      setErr('dob', 'Not permitted employee. Minimum age is 19.');
      setField('dob', '');
    } else {
      setErr('dob', '');
    }
  };

  const handleGrossChange = (value) => {
    setField('ot', value);
    const gross = parseFloat(value) || 0;
    const medical = 1250;
    const conveyance = 1600;
    const basic = Math.round(gross * 0.4);
    const hra = Math.round(gross * 0.16);
    const special = Math.max(0, gross - basic - hra - medical - conveyance);
    setForm((f) => ({
      ...f, ot: value, basicSalary: basic, hra, mAllowances: medical, conveyance, specialAllowances: special,
    }));
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('employee_code', form.employeeCode || '');
    fd.append('first_name', form.firstName);
    fd.append('last_name', form.lastName);
    fd.append('email', form.email);
    fd.append('phone', form.phone);
    fd.append('gender', form.gender);
    fd.append('dob', form.dob);
    fd.append('address', form.address);
    fd.append('bank_name', form.bankName || '');
    fd.append('account_number', form.accountNumber || '');
    fd.append('ifsc_code', (form.ifscCode || '').toUpperCase());
    fd.append('branch_name', form.branchName || '');
    fd.append('role_id', form.role || '');
    fd.append('department_id', form.department || '');
    fd.append('manager_id', form.manager || '');
    fd.append('jtype', form.jtype || '');
    fd.append('joining_date', form.joinDate || '');
    fd.append('status', form.empStatus || 'active');
    fd.append('basic_salary', form.basicSalary || 0);
    fd.append('hra', form.hra || 0);
    fd.append('da', form.da || 0);
    fd.append('special_allowances', form.specialAllowances || 0);
    fd.append('medical_allowances', form.mAllowances || 0);
    fd.append('conveyance', form.conveyance || 0);
    fd.append('ot', form.ot || 0);
    fd.append('pf_applicable', form.pfApplicable ? 1 : 0);
    fd.append('esi_applicable', form.esiApplicable ? 1 : 0);
    fd.append('it_tax', form.ittax || 0);
    fd.append('p_tax', form.ptax || 0);
    fd.append('food', form.food || 0);
    fd.append('uniform', form.uniform || 0);
    fd.append('rent', form.rent || 0);
    fd.append('lwf', form.lwf || 0);
    fd.append('other_deduction', form.other_deduction || 0);
    fd.append('aadhaar', form.aadhaar || '');
    fd.append('pan', (form.pan || '').toUpperCase());
    fd.append('uan_number', form.uanNumber || '');
    fd.append('esic_number', form.esicNumber || '');
    fd.append('father_name', form.fatherName || '');
    fd.append('qualification', form.qualification || '');
    fd.append('blood_group', form.blood_group || '');
    fd.append('emergency_contact', form.emergencyContact || '');
    fd.append('district', form.district || '');
    fd.append('state', form.state || '');
    fd.append('pincode', form.pincode || '');
    fd.append('pf_number', form.pfNumber || '');
    fd.append('employee_master_type', form.employeeMaster || '');
    fd.append('caution_deposit', form.employeeMaster === 'caution_deposit' ? (form.cautionDeposit || 0) : 0);

    if (form.employeeMaster === 'originals_submission' && form.certName.trim() !== '') {
      fd.append('cert_name', form.certName.trim());
      if (certFile) fd.append('cert_file_0', certFile);
      fd.append('existing_cert_path_0', form.existingCertPath || '');
    }
    if (profileFile) fd.append('profile_image', profileFile);
    return fd;
  };

  const submit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      Swal.fire('Error', 'Please fix validation errors before saving.', 'error');
      return;
    }
    setSaving(true);
    try {
      const fd = buildFormData();
      const res = isEdit
        ? await employeeService.updateEmployee(employeeId, fd)
        : await employeeService.addEmployee(fd);

      if (res.success) {
        Swal.fire({ icon: 'success', title: 'Success', text: res.message, timer: 2000, showConfirmButton: false });
        onSaved();
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: res.message || 'Something went wrong' });
      }
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Server Error', text: 'Request failed. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (isEdit && previousStatusRef.current === 'active' && form.empStatus === 'inactive') {
      const result = await Swal.fire({
        title: 'Reason for status change', input: 'textarea', inputPlaceholder: 'Enter reason...', showCancelButton: true,
      });
      if (result.isConfirmed) submit();
    } else {
      submit();
    }
  };

  return (
    <div className="emp-modal-overlay" onClick={onClose}>
      <div className="emp-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="emp-modal-content">
          <div className="emp-modal-header">
            <h5 className="fw-bold text-white mb-0">
              <i className={`fas ${isEdit ? 'fa-user-edit' : 'fa-user-plus'} me-2`}></i>
              {isEdit ? 'Edit Employee' : 'Add Employee'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="emp-modal-body">
            <div className="emp-stepper-wrap">
              <div className="emp-stepper-track">
                <div className="emp-stepper-line">
                  <div className="emp-stepper-fill" style={{ width: `${(step - 1) * 33.3}%` }}></div>
                </div>
                {STEP_LABELS.map((label, idx) => {
                  const num = idx + 1;
                  const cls = num === step ? 'active' : num < step ? 'completed' : '';
                  return (
                    <div className={`emp-step-item ${cls}`} key={label}>
                      <div className="emp-step-circle"><i className={`fas ${STEP_ICONS[idx]}`}></i></div>
                      <div className="emp-step-label">{label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="emp-step-body">
              {step === 1 && (
                <div className="emp-step-panel">
                  <div className="emp-section-title"><i className="fas fa-user-circle me-2"></i>Basic Details</div>
                  <div className="row g-3">
                    <div className="col-md-12 text-center mb-2">
                      <div className="emp-avatar-wrap">
                        <img src={profilePreview} className="emp-avatar-img" alt="" />
                        <label className="emp-avatar-btn" htmlFor="profileImage"><i className="fas fa-camera"></i></label>
                        <input type="file" id="profileImage" className="d-none" accept="image/*" onChange={handleProfileChange} />
                      </div>
                    </div>

                    <Field label="First Name" required error={errors.firstName}>
                      <input className={`emp-input ${errors.firstName ? 'is-invalid' : ''}`} value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} placeholder="Enter first name" />
                    </Field>
                    <Field label="Last Name" required error={errors.lastName}>
                      <input className={`emp-input ${errors.lastName ? 'is-invalid' : ''}`} value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} placeholder="Enter last name" />
                    </Field>
                    <Field label="Date of Birth" required error={errors.dob}>
                      <input type="date" className={`emp-input ${errors.dob ? 'is-invalid' : ''}`} value={form.dob} onChange={(e) => handleDobChange(e.target.value)} />
                    </Field>
                    <Field label="Mobile Number" required error={errors.phone}>
                      <input className={`emp-input ${errors.phone ? 'is-invalid' : ''}`} maxLength={10} value={form.phone}
                        onChange={(e) => setField('phone', e.target.value.replace(/[^0-9]/g, ''))} placeholder="10-digit mobile" />
                    </Field>
                    <Field label="Emergency Contact" required error={errors.emergencyContact}>
                      <input className={`emp-input ${errors.emergencyContact ? 'is-invalid' : ''}`} maxLength={10} value={form.emergencyContact}
                        onChange={(e) => setField('emergencyContact', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Emergency number" />
                    </Field>
                    <Field label="Email Address" required error={errors.email}>
                      <input type="email" className={`emp-input ${errors.email ? 'is-invalid' : ''}`} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="Enter email" />
                    </Field>
                    <Field label="Gender" required error={errors.gender}>
                      <select className={`emp-input ${errors.gender ? 'is-invalid' : ''}`} value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </Field>
                    <Field label="Blood Group" required error={errors.blood_group}>
                      <select className={`emp-input ${errors.blood_group ? 'is-invalid' : ''}`} value={form.blood_group} onChange={(e) => setField('blood_group', e.target.value)}>
                        <option value="">Select Blood Group</option>
                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </Field>
                    <Field label="Father Name / Guardian Name" required error={errors.fatherName}>
                      <input className={`emp-input ${errors.fatherName ? 'is-invalid' : ''}`} value={form.fatherName} onChange={(e) => setField('fatherName', e.target.value)} placeholder="Father / Guardian name" />
                    </Field>
                    <Field label="Qualification" required error={errors.qualification}>
                      <input className={`emp-input ${errors.qualification ? 'is-invalid' : ''}`} value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} placeholder="e.g. B.Com, MBA" />
                    </Field>
                    <div className="col-12">
                      <label className="emp-label">Address</label>
                      <textarea className="emp-input" rows={2} value={form.address} onChange={(e) => setField('address', e.target.value)} placeholder="Enter full address" />
                    </div>
                    <Field label="State" required error={errors.state}>
                      <select className={`emp-input ${errors.state ? 'is-invalid' : ''}`} value={form.state} onChange={(e) => handleStateChange(e.target.value)}>
                        <option value="">Select State</option>
                        {Object.keys(STATE_DISTRICTS).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </Field>
                    <Field label="District" required error={errors.district}>
                      <select className={`emp-input ${errors.district ? 'is-invalid' : ''}`} value={form.district} onChange={(e) => setField('district', e.target.value)} disabled={!form.state}>
                        <option value="">{form.state ? 'Select District' : 'Select State first'}</option>
                        {(STATE_DISTRICTS[form.state] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>
                    <Field label="Pincode" required error={errors.pincode}>
                      <input className={`emp-input ${errors.pincode ? 'is-invalid' : ''}`} maxLength={6} value={form.pincode}
                        onChange={(e) => setField('pincode', e.target.value.replace(/[^0-9]/g, ''))} placeholder="Enter 6-digit pincode" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="emp-step-panel">
                  <div className="emp-section-title"><i className="fas fa-id-card me-2"></i>Identity & Bank Details</div>
                  <div className="row g-3">
                    <Field label="Aadhaar Number" required error={errors.aadhaar} col="col-md-6">
                      <input className={`emp-input ${errors.aadhaar ? 'is-invalid' : ''}`} maxLength={12} value={form.aadhaar} onChange={(e) => setField('aadhaar', e.target.value)} placeholder="12-digit Aadhaar" />
                    </Field>
                    <Field label="PAN Number" error={errors.pan} col="col-md-6">
                      <input className={`emp-input ${errors.pan ? 'is-invalid' : ''}`} maxLength={10} style={{ textTransform: 'uppercase' }} value={form.pan} onChange={(e) => setField('pan', e.target.value)} placeholder="e.g. ABCDE1234F" />
                    </Field>
                    <Field label="PF Number" error={errors.pfNumber} col="col-md-6">
                      <input className="emp-input" value={form.pfNumber} onChange={(e) => setField('pfNumber', e.target.value)} placeholder="Enter PF number (if applicable)" />
                    </Field>
                    <div className="col-12 mt-2">
                      <div className="emp-divider-label"><i className="fas fa-university me-2"></i>Bank Information</div>
                    </div>
                    <Field label="Bank Name" required error={errors.bankName} col="col-md-6">
                      <input className={`emp-input ${errors.bankName ? 'is-invalid' : ''}`} value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} placeholder="Enter bank name" />
                    </Field>
                    <Field label="Branch Name" required error={errors.branchName} col="col-md-6">
                      <input className={`emp-input ${errors.branchName ? 'is-invalid' : ''}`} value={form.branchName} onChange={(e) => setField('branchName', e.target.value)} placeholder="Enter branch name" />
                    </Field>
                    <Field label="Account Number" required error={errors.accountNumber} col="col-md-4">
                      <div style={{ position: 'relative' }}>
                        <input type={showAccount ? 'text' : 'password'} className={`emp-input ${errors.accountNumber ? 'is-invalid' : ''}`} value={form.accountNumber} onChange={(e) => setField('accountNumber', e.target.value)} placeholder="Enter account number" />
                        <span className="emp-eye-toggle" onClick={() => setShowAccount((v) => !v)}><i className={`fas ${showAccount ? 'fa-eye' : 'fa-eye-slash'}`}></i></span>
                      </div>
                    </Field>
                    <div className="col-md-4">
                      <label className="emp-label">Confirm Account Number <span className="text-danger">*</span></label>
                      <div style={{ position: 'relative' }}>
                        <input type={showConfirmAccount ? 'text' : 'password'} className={`emp-input ${errors.confirmAccountNumber ? 'is-invalid' : ''}`} value={form.confirmAccountNumber} onChange={(e) => setField('confirmAccountNumber', e.target.value)} placeholder="Re-enter account number" />
                        <span className="emp-eye-toggle" onClick={() => setShowConfirmAccount((v) => !v)}><i className={`fas ${showConfirmAccount ? 'fa-eye' : 'fa-eye-slash'}`}></i></span>
                      </div>
                      <div className="emp-err">{errors.confirmAccountNumber}</div>
                      {accMatch !== null && (
                        <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                          {accMatch
                            ? <span style={{ color: '#10b981' }}><i className="fas fa-check-circle"></i> Account numbers match</span>
                            : <span style={{ color: '#ef4444' }}><i className="fas fa-times-circle"></i> Account numbers do not match</span>}
                        </div>
                      )}
                    </div>
                    <Field label="IFSC Code" required error={errors.ifscCode} col="col-md-4">
                      <input className={`emp-input ${errors.ifscCode ? 'is-invalid' : ''}`} maxLength={11} style={{ textTransform: 'uppercase' }} value={form.ifscCode} onChange={(e) => setField('ifscCode', e.target.value)} placeholder="e.g. SBIN0001234" />
                    </Field>
                    <Field label="UAN Number" col="col-md-4">
                      <input className="emp-input" maxLength={12} value={form.uanNumber} onChange={(e) => setField('uanNumber', e.target.value)} placeholder="Enter 12-digit UAN" />
                    </Field>
                    <Field label="ESIC Number" col="col-md-4">
                      <input className="emp-input" maxLength={17} value={form.esicNumber} onChange={(e) => setField('esicNumber', e.target.value)} placeholder="Enter ESIC Insurance Number" />
                    </Field>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="emp-step-panel">
                  <div className="emp-section-title"><i className="fas fa-briefcase me-2"></i>Job Information</div>
                  <div className="row g-3">
                    <Field label="Join Date" required error={errors.joinDate} col="col-md-3">
                      <input type="date" className={`emp-input ${errors.joinDate ? 'is-invalid' : ''}`} value={form.joinDate} onChange={(e) => setField('joinDate', e.target.value)} />
                    </Field>
                    <div className="col-md-3">
                      <label className="emp-label">Status</label>
                      <select className="emp-input" value={form.empStatus} onChange={(e) => setField('empStatus', e.target.value)}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="emp-label">Type</label>
                      <select className="emp-input" value={form.jtype} onChange={(e) => setField('jtype', e.target.value)}>
                        <option value="Permanent">Permanent</option>
                        <option value="Temporary">Temporary</option>
                      </select>
                    </div>
                    <Field label="Department" required error={errors.department} col="col-md-4">
                      <select className={`emp-input ${errors.department ? 'is-invalid' : ''}`} value={form.department} onChange={(e) => setField('department', e.target.value)}>
                        <option value="">Select</option>
                        {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Role" required error={errors.role} col="col-md-4">
                      <select className={`emp-input ${errors.role ? 'is-invalid' : ''}`} value={form.role} onChange={(e) => setField('role', e.target.value)}>
                        <option value="">Select</option>
                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </Field>
                    <div className="col-md-4">
                      <label className="emp-label">Manager</label>
                      <select className="emp-input" value={form.manager} onChange={(e) => setField('manager', e.target.value)}>
                        <option value="">Select</option>
                        {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="emp-label">Employee Master</label>
                      <select className="emp-input" value={form.employeeMaster} onChange={(e) => setField('employeeMaster', e.target.value)}>
                        <option value="">-- Select --</option>
                        <option value="caution_deposit">Caution Deposit</option>
                        <option value="originals_submission">Originals Submission</option>
                      </select>
                    </div>

                    {form.employeeMaster === 'caution_deposit' && (
                      <div className="col-12">
                        <div className="emp-divider-label"><i className="fas fa-rupee-sign me-2"></i>Caution Deposit</div>
                        <div className="row g-3 mt-1">
                          <div className="col-md-4">
                            <label className="emp-label">Deposit Amount</label>
                            <div className="emp-currency-wrap">
                              <span className="emp-currency-sym">₹</span>
                              <input type="number" className="emp-input emp-currency-input" min="0" value={form.cautionDeposit} onChange={(e) => setField('cautionDeposit', e.target.value)} placeholder="Enter amount" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {form.employeeMaster === 'originals_submission' && (
                      <div className="col-12">
                        <div className="emp-divider-label"><i className="fas fa-file-alt me-2"></i>Originals Submission</div>
                        <div className="mt-2">
                          <div className="row g-3 align-items-end mb-2">
                            <div className="col-md-4">
                              <label className="emp-label">Certificate Name</label>
                              <input className="emp-input" value={form.certName} onChange={(e) => setField('certName', e.target.value)} placeholder="e.g. 10th Marksheet, Degree" />
                            </div>
                            <div className="col-md-4">
                              <label className="emp-label">Upload Certificate</label>
                              <input type="file" accept="image/jpeg,image/png" onChange={handleCertChange} className="form-control" />
                              <small className="text-muted">Only JPG/PNG, Max 2MB</small>
                            </div>
                            <div className="col-md-4 pt-1">
                              <button type="button" className="btn btn-sm btn-primary" onClick={viewCert}>
                                <i className="fas fa-eye me-1"></i> View
                              </button>
                            </div>
                          </div>
                          {certPreview && (
                            <div className="row mt-2">
                              <div className="col-md-4 offset-md-4">
                                <img src={certPreview} alt="Certificate Preview" style={{ maxWidth: '100%', maxHeight: 200, border: '1px solid #ddd', borderRadius: 6, padding: 4 }} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="emp-step-panel">
                  <div className="emp-section-title"><i className="fas fa-rupee-sign me-2"></i>Salary Information</div>

                  <p className="emp-sub-label mb-3">Earnings</p>
                  <div className="row g-3">
                    <MoneyField label="Basic Salary" value={form.basicSalary} readOnly />
                    <MoneyField label="HRA" value={form.hra} readOnly />
                    <MoneyField label="DA" value={form.da} onChange={(v) => setField('da', v)} />
                    <MoneyField label="Special Allowances" value={form.specialAllowances} readOnly />
                    <MoneyField label="Medical" value={form.mAllowances} readOnly />
                    <MoneyField label="Conveyance" value={form.conveyance} readOnly />
                    <MoneyField label="Total Gross" value={form.ot} onChange={handleGrossChange} />
                  </div>

                  <p className="emp-sub-label mt-4 mb-3">Deductions</p>
                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <div className="emp-toggle-card">
                        <div className="d-flex align-items-center gap-3">
                          <i className="fas fa-piggy-bank fa-lg text-primary"></i>
                          <div>
                            <div className="fw-semibold">PF (Provident Fund)</div>
                            <small className="text-muted">Amount calculated automatically</small>
                          </div>
                          <label className="emp-toggle ms-auto">
                            <input type="checkbox" checked={form.pfApplicable} onChange={(e) => setField('pfApplicable', e.target.checked)} />
                            <span className="emp-toggle-slider"></span>
                          </label>
                        </div>
                        <p className="mb-0 mt-2" style={{ fontSize: '0.82rem' }}>
                          Status: <span className={form.pfApplicable ? 'text-success fw-bold' : 'text-danger fw-bold'}>{form.pfApplicable ? 'Enabled' : 'Disabled'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="emp-toggle-card">
                        <div className="d-flex align-items-center gap-3">
                          <i className="fas fa-heart fa-lg text-danger"></i>
                          <div>
                            <div className="fw-semibold">ESI (Employee State Insurance)</div>
                            <small className="text-muted">Amount calculated automatically</small>
                          </div>
                          <label className="emp-toggle ms-auto">
                            <input type="checkbox" checked={form.esiApplicable} onChange={(e) => setField('esiApplicable', e.target.checked)} />
                            <span className="emp-toggle-slider"></span>
                          </label>
                        </div>
                        <p className="mb-0 mt-2" style={{ fontSize: '0.82rem' }}>
                          Status: <span className={form.esiApplicable ? 'text-success fw-bold' : 'text-danger fw-bold'}>{form.esiApplicable ? 'Enabled' : 'Disabled'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3">
                    <MoneyField label="IT Tax" value={form.ittax} onChange={(v) => setField('ittax', v)} />
                    <MoneyField label="P Tax" value={form.ptax} onChange={(v) => setField('ptax', v)} />
                    <MoneyField label="Food" value={form.food} onChange={(v) => setField('food', v)} />
                    <MoneyField label="Uniform" value={form.uniform} onChange={(v) => setField('uniform', v)} />
                    <MoneyField label="House Rent" value={form.rent} onChange={(v) => setField('rent', v)} />
                    <MoneyField label="LWF" value={form.lwf} onChange={(v) => setField('lwf', v)} />
                    <MoneyField label="Other" value={form.other_deduction} onChange={(v) => setField('other_deduction', v)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="emp-modal-footer">
            <button type="button" className="btn btn-light px-4 emp-footer-btn" onClick={onClose}>Cancel</button>
            {step > 1 && (
              <button type="button" className="btn emp-btn-outline px-4 emp-footer-btn" onClick={handlePrev}>
                <i className="fas fa-chevron-left me-1"></i> Previous
              </button>
            )}
            {step < 4 && (
              <button type="button" className="btn emp-btn-primary px-4 emp-footer-btn" onClick={handleNext}>
                Next <i className="fas fa-chevron-right ms-1"></i>
              </button>
            )}
            {step === 4 && (
              <button type="button" className="btn emp-btn-success px-4 emp-footer-btn" disabled={saving} onClick={handleFinalSubmit}>
                <i className="fas fa-check me-1"></i> {saving ? 'Saving...' : 'Save Employee'}
              </button>
            )}
          </div>
        </div>
      </div>

      {certModalOpen && (
        <div className="emp-modal-overlay" style={{ zIndex: 1200 }} onClick={() => setCertModalOpen(false)}>
          <div className="emp-modal-dialog" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Certificate Preview</h5>
                <button type="button" className="btn-close" onClick={() => setCertModalOpen(false)}></button>
              </div>
              <div className="modal-body text-center">
                <img src={certModalSrc} style={{ maxWidth: '100%', height: 'auto' }} alt="" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, error, col = 'col-md-4', children }) {
  return (
    <div className={col}>
      <label className="emp-label">{label} {required && <span className="text-danger">*</span>}</label>
      {children}
      <div className="emp-err">{error}</div>
    </div>
  );
}

function MoneyField({ label, value, onChange, readOnly }) {
  return (
    <div className="col-md-3">
      <label className="emp-label">{label}</label>
      <div className="emp-currency-wrap">
        <span className="emp-currency-sym">₹</span>
        <input
          type="number"
          className="emp-input emp-currency-input"
          min="0"
          placeholder="0"
          value={value}
          readOnly={readOnly}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
      </div>
    </div>
  );
}