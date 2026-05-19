/** Consistent user shape for API responses (matches login/register). */
exports.formatUser = (user) => {
  if (!user) return null;
  const u = user.toObject ? user.toObject() : user;
  return {
    id:       u._id,
    userId:   u.userId,
    name:     u.name,
    email:    u.email,
    role:     u.role,
    phone:    u.phone || '',
    dept:     u.dept || '',
    empId:    u.empId || '',
    avatar:   u.avatar || (u.name ? u.name.charAt(0).toUpperCase() : '?'),
    createdAt: u.createdAt
  };
};
