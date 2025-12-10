import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { Button } from "../components/ui";

const NotFoundPage = () => {
  return (
    <Layout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <h2 className="text-2xl font-semibold text-gray-900 mt-4">
            Không tìm thấy trang
          </h2>
          <p className="text-gray-600 mt-2">
            Trang bạn đang tìm không tồn tại hoặc đã bị xóa.
          </p>
          <Link to="/" className="inline-block mt-6">
            <Button>Về trang chủ</Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFoundPage;
