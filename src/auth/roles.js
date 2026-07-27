export const roles = {
  admin: "admin",
  member: "member",
};

export function isAdminRole(role) {
  return role === roles.admin;
}
