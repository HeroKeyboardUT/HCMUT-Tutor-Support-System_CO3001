import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center mb-4">
              <span className="text-white text-xl font-bold">HCMUT</span>
              <span className="text-yellow-400 text-xl font-bold ml-1">
                Tutor
              </span>
            </div>
            <p className="text-gray-400 text-sm">
              Hệ thống quản lý chương trình Tutor/Mentor của Trường Đại học Bách
              Khoa - ĐHQG TP.HCM. Hỗ trợ sinh viên trong quá trình học tập và
              phát triển kỹ năng.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Liên kết
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/tutors"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Tìm Tutor
                </Link>
              </li>
              <li>
                <Link
                  to="/library"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Thư viện
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link
                  to="/help"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Hỗ trợ
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4">
              Liên hệ
            </h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>268 Lý Thường Kiệt, Q.10, TP.HCM</li>
              <li>Email: tutor@hcmut.edu.vn</li>
              <li>Điện thoại: (028) 3864 7256</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © 2024 HCMUT Tutor. Bản quyền thuộc về Trường ĐH Bách Khoa - ĐHQG
            TP.HCM.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-white">
              <span className="sr-only">Facebook</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
