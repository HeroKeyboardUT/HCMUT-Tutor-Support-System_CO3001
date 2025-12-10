const {
  Session,
  TutorProfile,
  StudentProfile,
  Notification,
} = require("../model");
const { sessionStatus, notificationTypes } = require("../config/config");
const {
  getVietnamNow,
  getVietnamTodayStart,
  getVietnamTodayEnd,
} = require("./timezone");

/**
 * Auto-complete sessions that have passed their end time
 * This function should be called periodically (e.g., every 5 minutes)
 */
const autoCompleteSessions = async () => {
  try {
    const vietnamNow = getVietnamNow();
    const todayStart = getVietnamTodayStart();
    const todayEnd = getVietnamTodayEnd();
    const currentTime = vietnamNow.toTimeString().slice(0, 5); // "HH:MM" in Vietnam time

    // Find sessions that are in_progress and have passed their end time
    const expiredSessions = await Session.find({
      status: sessionStatus.IN_PROGRESS,
      $or: [
        // Sessions from previous days
        { scheduledDate: { $lt: todayStart } },
        // Sessions from today that have passed end time
        {
          scheduledDate: {
            $gte: todayStart,
            $lt: todayEnd,
          },
          endTime: { $lt: currentTime },
        },
      ],
    }).populate("tutor student");

    console.log(
      `[SessionScheduler] Found ${expiredSessions.length} expired sessions to auto-complete`
    );

    for (const session of expiredSessions) {
      try {
        session.status = sessionStatus.COMPLETED;
        session.completedAt = new Date();
        session.autoCompleted = true; // Mark as auto-completed
        await session.save();

        // Update tutor stats
        await TutorProfile.findByIdAndUpdate(
          session.tutor._id || session.tutor,
          {
            $inc: { completedSessions: 1 },
          }
        );

        // Update student stats if exists
        if (session.student) {
          const TRAINING_POINTS_PER_SESSION = 5;
          await StudentProfile.findByIdAndUpdate(
            session.student._id || session.student,
            {
              $inc: {
                completedSessions: 1,
                trainingPoints: TRAINING_POINTS_PER_SESSION,
              },
              $push: {
                trainingPointsHistory: {
                  points: TRAINING_POINTS_PER_SESSION,
                  reason: `Auto-completed session: ${session.title}`,
                  sessionId: session._id,
                  awardedAt: new Date(),
                },
              },
            }
          );
        }

        // Also update stats for registered students in open sessions
        if (session.registeredStudents?.length > 0) {
          const TRAINING_POINTS_PER_SESSION = 5;
          const studentIds = session.registeredStudents.map((r) => r.student);
          await StudentProfile.updateMany(
            { _id: { $in: studentIds } },
            {
              $inc: {
                completedSessions: 1,
                trainingPoints: TRAINING_POINTS_PER_SESSION,
              },
              $push: {
                trainingPointsHistory: {
                  points: TRAINING_POINTS_PER_SESSION,
                  reason: `Auto-completed session: ${session.title}`,
                  sessionId: session._id,
                  awardedAt: new Date(),
                },
              },
            }
          );
        }

        // Create notification for tutor
        const tutorUserId = session.tutor?.user || session.tutor;
        if (tutorUserId) {
          await Notification.create({
            user: tutorUserId,
            type: notificationTypes.SESSION_COMPLETED,
            title: "Session Auto-Completed",
            message: `Session "${session.title}" has been automatically completed because it passed the scheduled end time.`,
            relatedSession: session._id,
          });
        }

        console.log(
          `[SessionScheduler] Auto-completed session: ${session._id}`
        );
      } catch (sessionError) {
        console.error(
          `[SessionScheduler] Failed to auto-complete session ${session._id}:`,
          sessionError
        );
      }
    }

    return expiredSessions.length;
  } catch (error) {
    console.error("[SessionScheduler] Error in autoCompleteSessions:", error);
    return 0;
  }
};

/**
 * Auto-cancel sessions that were confirmed but never started
 * (optional - cancel sessions that are 30 minutes past start time without being started)
 */
const autoCancelNoShowSessions = async () => {
  try {
    const vietnamNow = getVietnamNow();
    const todayStart = getVietnamTodayStart();
    const todayEnd = getVietnamTodayEnd();

    // Find confirmed sessions that should have started 30+ minutes ago
    const noShowSessions = await Session.find({
      status: sessionStatus.CONFIRMED,
      scheduledDate: {
        $gte: todayStart,
        $lt: todayEnd,
      },
    });

    let cancelledCount = 0;
    for (const session of noShowSessions) {
      // Parse start time and check if it's 30+ minutes past (in Vietnam time)
      const [hours, minutes] = session.startTime.split(":").map(Number);

      // Create session start datetime in Vietnam timezone
      const sessionDate = new Date(session.scheduledDate);
      const sessionStartVietnam = new Date(sessionDate);
      sessionStartVietnam.setUTCHours(hours - 7, minutes, 0, 0); // Convert Vietnam time to UTC

      // Check if session should have started 30+ minutes ago
      const thirtyMinutesAgo = new Date(vietnamNow.getTime() - 30 * 60 * 1000);
      if (sessionStartVietnam < thirtyMinutesAgo) {
        session.status = sessionStatus.NO_SHOW;
        session.cancelledAt = new Date();
        session.cancellationReason =
          "Session was not started within 30 minutes of scheduled time";
        await session.save();

        // Notify both tutor and student
        const tutorUserId = session.tutor?.user || session.tutor;
        if (tutorUserId) {
          await Notification.create({
            user: tutorUserId,
            type: notificationTypes.SESSION_NO_SHOW,
            title: "Session Marked as No-Show",
            message: `Session "${session.title}" was marked as no-show because it wasn't started within 30 minutes of the scheduled time.`,
            relatedSession: session._id,
          });
        }

        cancelledCount++;
        console.log(
          `[SessionScheduler] Marked session as no-show: ${session._id}`
        );
      }
    }

    return cancelledCount;
  } catch (error) {
    console.error(
      "[SessionScheduler] Error in autoCancelNoShowSessions:",
      error
    );
    return 0;
  }
};

/**
 * Start the session scheduler
 * Runs every 5 minutes
 */
const startSessionScheduler = () => {
  const INTERVAL = 5 * 60 * 1000; // 5 minutes

  console.log("[SessionScheduler] Starting session scheduler...");

  // Run immediately on start
  autoCompleteSessions();
  autoCancelNoShowSessions();

  // Then run periodically
  setInterval(async () => {
    const completed = await autoCompleteSessions();
    const noShow = await autoCancelNoShowSessions();
    if (completed > 0 || noShow > 0) {
      console.log(
        `[SessionScheduler] Processed: ${completed} completed, ${noShow} no-show`
      );
    }
  }, INTERVAL);
};

module.exports = {
  autoCompleteSessions,
  autoCancelNoShowSessions,
  startSessionScheduler,
};
