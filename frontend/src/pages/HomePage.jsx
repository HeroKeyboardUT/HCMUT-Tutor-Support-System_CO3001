import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PublicLayout } from "../components/Layout";

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  // If authenticated, redirect to dashboard
  if (isAuthenticated) {
    return (
      <PublicLayout>
        <div className="flex-1 flex items-center justify-center">
          <Link
            to="/dashboard"
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-medium text-lg"
          >
            Go to Dashboard
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex-1 flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center py-16 px-4">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-600 text-center mb-4">
            Welcome to BK Tutor Support System
          </h1>
          <p className="text-gray-600 text-center max-w-2xl mb-8 text-lg">
            A modern platform connecting students and tutors, supporting
            learning, mentoring, and skill development.
          </p>
          <Link
            to="/register"
            className="bg-blue-500 hover:bg-blue-600 text-white px-10 py-3 rounded-full font-medium text-lg transition-colors"
          >
            Get Started
          </Link>
        </section>

        {/* Features Section */}
        <section className="pb-16 px-4">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Student Portal */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Student Portal
              </h3>
              <p className="text-gray-500 text-center text-sm">
                Register for tutor programs, choose tutors, and give feedback
                easily.
              </p>
            </div>

            {/* Tutor Dashboard */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow border-2 border-blue-100">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Tutor Dashboard
              </h3>
              <p className="text-gray-500 text-center text-sm">
                Manage schedules, track mentee progress, and record session
                summaries.
              </p>
            </div>

            {/* Coordinator Tools */}
            <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
                Coordinator Tools
              </h3>
              <p className="text-gray-500 text-center text-sm">
                Monitor tutor activities, manage assignments, and export reports
                for departments.
              </p>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
};

export default HomePage;
