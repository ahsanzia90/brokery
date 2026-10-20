export default function AdminForbidden() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-bold">Permission required</h1>
      <p className="mt-2 text-muted">Your admin role does not include access to this module. Ask a super admin to adjust your role.</p>
    </div>
  );
}
