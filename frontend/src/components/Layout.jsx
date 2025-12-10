import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const DashboardLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#e8f4fc]">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {(title || subtitle) && (
            <div className="mb-6">
              {title && (
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              )}
              {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#e8f4fc]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export { DashboardLayout, PublicLayout };
export default DashboardLayout;
