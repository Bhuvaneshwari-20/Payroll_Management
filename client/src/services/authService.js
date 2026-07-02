import api from './api';

export async function login(employeeId,password){

    const {data}=await api.post("/auth/login",{

        employeeId,

        password

    });

    return data;

}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}
