import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui";

const UnauthorizedPage = () => {
  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Không có quyền truy cập
          </h2>
          <p className="text-gray-600 mt-2">
            Bạn không có quyền truy cập trang này. Vui lòng liên hệ quản trị
            viên nếu cần.
          </p>
          <div className="flex gap-4 justify-center mt-6">
            <Link to="/dashboard">
              <Button>Về Dashboard</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default UnauthorizedPage;
