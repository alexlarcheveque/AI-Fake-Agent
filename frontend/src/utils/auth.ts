export const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  console.log("Auth token from localStorage:", token ? "Found" : "Not found");
  return {
    Authorization: token ? `Bearer ${token}` : "",
  };
};
