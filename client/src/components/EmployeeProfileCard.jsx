
import { useEffect, useState } from 'react';
import { fetchMyProfile } from '../services/dashboardService';
import defaultProfile from "../assets/images/default-profile.png";

export default function EmployeeProfileCard() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMyProfile()
      .then((res) => {
        if (res.success) setProfile(res.data);
        else setError(res.message || 'Failed to load profile');
      })
      .catch((err) => setError(err.response?.data?.message || 'Failed to connect to the server'));
  }, []);

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!profile) return <div className="text-muted">Loading profile…</div>;

  return (
    <div className="employee-profile-card">
      <div className="profile-sidebar">
        <img
          src={
            profile.profile_image
              ? `/api/uploads/profiles/${profile.profile_image}`
              : defaultProfile
          }
          alt="Profile"
          className="profile-img"
        />
        <span className={`status-badge ${profile.status === 'active' ? 'active' : 'inactive'}`}>
          {profile.status === 'active' ? 'Active' : 'Inactive'}
        </span>
        <h3 className="employee-name">
          {profile.first_name} {profile.last_name}
        </h3>
        <p className="employee-role">{profile.role_name}</p>
        <div className="employee-code-badge">{profile.employee_code}</div>
      </div>

      <div className="employee-info">
        <h4 className="section-title">Employee Information</h4>
        <div className="info-grid">
          <div className="info-card">
            <div className="info-icon department-icon">
              <i className="fas fa-sitemap"></i>
            </div>
            <div className="info-content">
              <h6>Department</h6>
              <p>{profile.department_name || 'Not assigned'}</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon role-icon">
              <i className="fas fa-user-tag"></i>
            </div>
            <div className="info-content">
              <h6>Role</h6>
              <p>{profile.role_name || 'Not assigned'}</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon manager-icon">
              <i className="fas fa-user-tie"></i>
            </div>
            <div className="info-content">
              <h6>Manager</h6>
              <p>{profile.manager_name || 'Not assigned'}</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-icon id-icon">
              <i className="fas fa-id-card"></i>
            </div>
            <div className="info-content">
              <h6>Employee ID</h6>
              <p>{profile.employee_code}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
