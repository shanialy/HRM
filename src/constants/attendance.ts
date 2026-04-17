export const ATTENDANCE_CONSTANT = {
  ALREADY_CHECKEDIN: "Already checked in for this day",
  CHECKIN_SUCCESS: "Checked in successfully",
  CHECKIN_NOT_FOUND: "Check-in not found for this day",
  ALREADY_CHECKEDOUT: "Already checked out for this day",
  CHECKOUT_SUCCESS: "Checked out successfully",
  FETCHED: "My attendance fetched successfully",
  ADMIN_FETCHED: "attendance fetched successfully",
  ALREADY_EXISTS: "Attendance or leave already exists for this date",
  SUCCESSFULL: "Leave requested successfully",
  RECORD_NOTFOUND: "Leave record not found",
  APPROVED: "Leave approved successfully",
  REJECT: "Leave rejected successfully",
};

// export const calculateDistance = (
//   lat1: number,
//   lon1: number,
//   lat2: number,
//   lon2: number,
// ) => {
//   const R = 6371e3; // earth radius in meters

//   const φ1 = (lat1 * Math.PI) / 180;
//   const φ2 = (lat2 * Math.PI) / 180;

//   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
//   const Δλ = ((lon2 - lon1) * Math.PI) / 180;

//   const a =
//     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//   return R * c; // distance meters me
// };
