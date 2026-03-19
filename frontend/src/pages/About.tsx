export default function About() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-[#5CA6E2]">About Health Link</h2>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3 text-gray-700">
        <p>Health Link is a prototype for cross-clinic patient records in Mukono district.</p>
        <p>Clinic staff can register patients, request OTP-based access, and add visits. Admin users can also edit/delete records and manage clinics.</p>
        
        <h3 className="font-bold text-gray-800 mt-4">How It Works:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Login as admin or staff.</li>
          <li>Search patients by name or display ID.</li>
          <li>Open patient details, request OTP, and verify code 48291.</li>
          <li>Add visits linked to clinic and patient.</li>
          <li>Admin can manage clinics and all visits.</li>
        </ul>

        <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-100">
          <p className="font-bold text-[#DF3232] text-sm text-center">PROTOTYPE - NOT FOR REAL MEDICAL USE</p>
        </div>
      </div>
    </div>
  );
}