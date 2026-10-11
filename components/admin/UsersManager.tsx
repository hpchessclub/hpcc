"use client";
import { useEffect, useMemo, useState } from "react";
import { AREA_LABELS, ROLES, ROLE_LABELS, roleAreas } from "@/lib/roles";

export default function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [message,setMessage]=useState("");
  const [busyId,setBusyId]=useState("");
  const [currentUserId,setCurrentUserId]=useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: "", last_name: "", email: "", password: "", role: "admin" });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users",{cache:"no-store"});
      const json = await res.json();
      if(!res.ok)throw new Error(json.error||"Unable to load users.");
      setUsers(json.users || []);setCurrentUserId(json.current_user_id||"");
    } catch(error){setMessage(error instanceof Error?error.message:"Unable to load users.");}
    finally{setLoading(false);}
  }
  useEffect(() => { load(); }, []);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...newUser }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) return alert(json.error || "Unable to create user");
    setNewUser({ first_name: "", last_name: "", email: "", password: "", role: "admin" });
    setShowAdd(false);
    load();
  }

  async function update(id: string, role: string, is_active: boolean, first_name: string, last_name: string) {
    if(busyId)return;setBusyId(id);setMessage("");
    try{
      const res=await fetch("/api/admin/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,role,is_active,first_name,last_name})});
      const json=await res.json();if(!res.ok)throw new Error(json.error||"Unable to update user.");
      await load();setMessage("User access saved.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to update user.");}finally{setBusyId("");}
  }

  async function remove(id:string,email:string){
    if(busyId||!confirm(`Remove ${email}? The login and profile will be deleted where possible. If deletion is blocked, admin access will be revoked and club files retained.`))return;
    setBusyId(id);setMessage("");
    try{
      const res=await fetch(`/api/admin/users?id=${encodeURIComponent(id)}`,{method:"DELETE"});const json=await res.json();
      if(!res.ok)throw new Error(json.error||"Unable to remove user.");
      await load();setMessage(json.message||"User removed.");
    }catch(error){setMessage(error instanceof Error?error.message:"Unable to remove user.");}finally{setBusyId("");}
  }

  const filtered = useMemo(
    () => users.filter((u) => `${u.first_name || ""} ${u.last_name || ""} ${u.full_name || ""} ${u.email || ""}`.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  if (loading && !users.length) return <p>Loading users...</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">Manage Users & Roles</h1>
          <p className="mt-2 text-sm text-slate-600">
            Super Admin can add, edit, remove and activate/deactivate admin access. Public club members do not need login.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAdd((v) => !v)} className="btn-primary">{showAdd ? "Close Add User" : "Add User"}</button>
          <button onClick={()=>{setMessage("");load();}} disabled={loading||!!busyId} className="btn-secondary">{loading?"Refreshing…":"Refresh"}</button>
        </div>
      </div>

      <p role="status" className="mt-4 whitespace-pre-line text-sm">{message}</p>
      <p className="mt-2 text-sm text-stone-600">Showing {filtered.length} of {users.length} accounts. Accounts missing a profile have no admin access until a Super Admin assigns a role and saves.</p>
      {showAdd && (
        <form onSubmit={createUser} className="card mt-6 p-5">
          <h2 className="text-xl font-bold">Add New Admin / Staff User</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label><span className="admin-label">First name *</span><input required value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Last name</span><input value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Email *</span><input required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Temporary password *</span><input required type="password" minLength={8} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className="admin-input mt-1" /></label>
            <label><span className="admin-label">Role *</span><select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className="admin-input mt-1">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></label>
          </div>
          <button disabled={creating} className="btn-primary mt-5">{creating ? "Creating..." : "Create User"}</button>
        </form>
      )}

      <div className="card mt-5 p-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} className="admin-input max-w-md" placeholder="Search users by name or email" />
      </div>

      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="p-3">First name</th>
              <th className="p-3">Last name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Access</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t align-top">
                <td className="p-3"><input defaultValue={u.first_name || ""} id={`first-${u.id}`} className="admin-input w-32" /></td>
                <td className="p-3"><input defaultValue={u.last_name || ""} id={`last-${u.id}`} className="admin-input w-32" /></td>
                <td className="p-3">{u.email}{!u.has_profile&&<p className="mt-1 text-xs text-amber-800">Missing profile — assign role and Save</p>}{!u.has_auth&&<p className="mt-1 text-xs text-amber-800">Profile only — login missing</p>}</td>
                <td className="p-3"><select defaultValue={u.role} id={`role-${u.id}`} className="admin-input min-w-48">{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></td>
                <td className="p-3 max-w-md text-xs text-slate-600">{roleAreas(u.role).map((a) => AREA_LABELS[a] || a).join(", ") || "No admin access"}</td>
                <td className="p-3"><input type="checkbox" defaultChecked={u.is_active} id={`active-${u.id}`} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button disabled={!!busyId || !u.has_auth}
                      onClick={() => update(
                        u.id,
                        (document.getElementById(`role-${u.id}`) as HTMLSelectElement).value,
                        (document.getElementById(`active-${u.id}`) as HTMLInputElement).checked,
                        (document.getElementById(`first-${u.id}`) as HTMLInputElement).value,
                        (document.getElementById(`last-${u.id}`) as HTMLInputElement).value
                      )}
                      className="btn-secondary py-2"
                    >
                      Save/Edit
                    </button>
                    <button disabled={!!busyId || u.id===currentUserId} title={u.id===currentUserId?"You cannot remove your own account":undefined} onClick={() => remove(u.id, u.email)} className="rounded-md bg-red-700 px-4 py-2 font-bold text-white hover:bg-red-800 disabled:opacity-50">{busyId===u.id?"Working…":"Remove"}</button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && <tr><td colSpan={7} className="p-5">No accounts match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
