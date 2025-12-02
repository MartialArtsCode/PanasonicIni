import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminUserManagement.css";

const API = "http://localhost:3000/api";

const roles = ["operator", "technician", "admin"];

const defaultModalState = {
  open: false,
  title: "",
  username: "",
  password: "",
  role: "operator",
  edit: false,
};

export default function AdminUserManagement({ adminToken }) {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(defaultModalState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adminToken) loadUsers();
    // eslint-disable-next-line
  }, [adminToken]);

  function loadUsers() {
    setLoading(true);
    axios
      .get(`${API}/users`, { headers: { Authorization: adminToken } })
      .then((resp) => setUsers(resp.data))
      .finally(() => setLoading(false));
  }

  function openAddModal() {
    setModal({ ...defaultModalState, open: true, title: "Add New User", edit: false });
  }

  function openEditModal(user) {
    setModal({
      open: true,
      title: `Edit User (${user.username})`,
      username: user.username,
      password: "",
      role: user.role,
      edit: true,
    });
  }

  function closeModal() {
    setModal(defaultModalState);
  }

  function handleSubmitModal(e) {
    e.preventDefault();
    const req = {
      username: modal.username,
      password: modal.password,
      role: modal.role,
    };
    if (!modal.edit) {
      if (!req.username || !req.password) return alert("Username and password are required");
      axios
        .post(`${API}/users`, req, {
          headers: { Authorization: adminToken },
        })
        .then(({ data }) => {
          if(data.error) alert(data.error);
          closeModal(); loadUsers();
        });
    } else {
      if (!req.role && !req.password) return alert("Nothing to update.");
      const body = {};
      if (req.role) body.role = req.role;
      if (req.password) body.password = req.password;
      axios
        .put(`${API}/users/${modal.username}`, body, {
          headers: { Authorization: adminToken },
        })
        .then(({ data }) => {
          if(data.error) alert(data.error);
          closeModal(); loadUsers();
        });
    }
  }

  function handleRoleChange(username, role) {
    axios
      .put(`${API}/users/${username}`, { role }, { headers: { Authorization: adminToken } })
      .then(() => loadUsers());
  }

  function handleDelete(username) {
    if (!window.confirm(`Delete user ${username}?`)) return;
    axios
      .delete(`${API}/users/${username}`, { headers: { Authorization: adminToken } })
      .then(() => loadUsers());
  }

  return (
    <div className="adminPanel">
      <h3>User Management (Admin Only)</h3>
      <button className="addUserBtn" onClick={openAddModal}>+ Add User</button>
      {loading && <div className="loader">Loading...</div>}
      <table className="userTable">
        <thead>
          <tr>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.username}>
              <td>{user.username}</td>
              <td>
                <select
                  disabled={user.username === "admin1"}
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.username, e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              </td>
              <td>
                <button
                  className="editBtn"
                  onClick={() => openEditModal(user)}
                  disabled={user.username === "admin1"}
                >Edit</button>
                <button
                  className="deleteBtn"
                  onClick={() => handleDelete(user.username)}
                  disabled={user.username === "admin1"}
                >Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Modal */}
      {modal.open && (
        <div className="modalBackdrop">
          <form className="modalWindow" onSubmit={handleSubmitModal}>
            <h2>{modal.title}</h2>
            <input
              className="modalInput"
              type="text"
              placeholder="Username"
              disabled={modal.edit}
              value={modal.username}
              onChange={(e) => setModal({ ...modal, username: e.target.value })}
              required={!modal.edit}
            />
            <input
              className="modalInput"
              type="password"
              placeholder={modal.edit ? "New password (blank to keep)" : "Set password"}
              value={modal.password}
              onChange={(e) => setModal({ ...modal, password: e.target.value })}
              required={!modal.edit}
            />
            <select
              className="modalInput"
              value={modal.role}
              onChange={(e) => setModal({ ...modal, role: e.target.value })}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <div className="modalActions">
              <button className="modalBtn cancelBtn" type="button" onClick={closeModal}>Cancel</button>
              <button className="modalBtn saveBtn" type="submit">Save</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
