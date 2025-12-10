// Unified list of subjects for the entire application
// This should match the subjects from backend/seeds/seed.js

export const SUBJECTS = [
  { name: "Lập trình C/C++", code: "CO1007" },
  { name: "Cấu trúc dữ liệu và Giải thuật", code: "CO2003" },
  { name: "Mạng máy tính", code: "CO3001" },
  { name: "Hệ điều hành", code: "CO2017" },
  { name: "Cơ sở dữ liệu", code: "CO2013" },
  { name: "Trí tuệ nhân tạo", code: "CO3061" },
  { name: "Machine Learning", code: "CO3068" },
  { name: "Kỹ thuật phần mềm", code: "CO3009" },
  { name: "Toán rời rạc", code: "MT1003" },
  { name: "Xác suất thống kê", code: "MT2013" },
  { name: "Đại số tuyến tính", code: "MT1007" },
  { name: "Vật lý đại cương", code: "PH1003" },
];

// Get subject names only (for dropdowns)
export const SUBJECT_NAMES = SUBJECTS.map((s) => s.name);

// Get subject by code
export const getSubjectByCode = (code) => SUBJECTS.find((s) => s.code === code);

// Get subject by name
export const getSubjectByName = (name) => SUBJECTS.find((s) => s.name === name);

export default SUBJECTS;
