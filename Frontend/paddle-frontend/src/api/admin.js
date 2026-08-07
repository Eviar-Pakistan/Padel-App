import adminApi from "./adminApi";

export const adminLogin = (data) => {
  return adminApi.post("super-admin/login", data);
};

export const listOrganizations = () => {
  return adminApi.get("super-admin/organizations");
};

export const createOrganization = (data) => {
  return adminApi.post("super-admin/organizations", data);
};
