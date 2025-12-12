import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { PublicLayout } from "../components/Layout";
import { tutorService } from "../services";

const TutorListPage = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");

  // Extract unique subjects from tutors data
  const subjects = [
    "all",
    ...new Set(
      tutors
        .flatMap((tutor) => tutor.expertise?.map((e) => e.subject || e) || [])
        .filter(Boolean)
    ),
  ];

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const res = await tutorService.getAll();
        if (res.success) {
          setTutors(res.data?.tutors || res.tutors || []);
        }
      } catch (error) {
        console.error("Failed to fetch tutors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTutors();
  }, []);

  const filteredTutors = tutors.filter((tutor) => {
    const name =
      tutor.user?.fullName ||
      `${tutor.user?.firstName || ""} ${tutor.user?.lastName || ""}`;
    const matchesSearch =
      !searchQuery ||
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.expertise?.some((e) =>
        (e.subject || e).toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Filter by selected subject
    const matchesSubject =
      selectedSubject === "all" ||
      tutor.expertise?.some((e) =>
        (e.subject || e).toLowerCase().includes(selectedSubject.toLowerCase())
      );

    return matchesSearch && matchesSubject;
  });

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Find Your Tutor
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Discover experienced tutors who can help you with your studies.
            Browse by subject or search for specific expertise.
          </p>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject === "all" ? "All Subjects" : subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tutors Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredTutors.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto mb-4"
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
            <p className="text-gray-500">No tutors found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTutors.map((tutor) => {
              const tutorName =
                tutor.user?.fullName ||
                `${tutor.user?.firstName || ""} ${tutor.user?.lastName || ""}`;
              const tutorAvatar = tutor.user?.avatar;
              const tutorDepartment =
                tutor.user?.department ||
                tutor.user?.faculty ||
                "Computer Science";
              const tutorRating = tutor.rating?.average || tutor.rating || 0;

              return (
                <div
                  key={tutor._id}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Avatar & Info */}
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                      {tutorAvatar ? (
                        <img
                          src={tutorAvatar}
                          alt={tutorName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-7 h-7 text-gray-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {tutorName}
                      </h3>
                      <p className="text-sm text-gray-500">{tutorDepartment}</p>
                      <div className="flex items-center mt-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-4 h-4 ${
                              star <= tutorRating
                                ? "text-yellow-400"
                                : "text-gray-300"
                            }`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="text-sm text-gray-500 ml-1">
                          ({tutor.totalSessions || 0} sessions)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(tutor.expertise || []).slice(0, 3).map((exp, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs rounded-full"
                      >
                        {exp.subject || exp}
                      </span>
                    ))}
                    {(tutor.expertise || []).length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        +{tutor.expertise.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3">
                    <Link
                      to={`/tutors/${tutor._id}`}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium text-center transition-colors"
                    >
                      View Profile
                    </Link>
                    <Link
                      to={`/matching?tutor=${tutor._id}`}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium text-center transition-colors"
                    >
                      Book Session
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default TutorListPage;
