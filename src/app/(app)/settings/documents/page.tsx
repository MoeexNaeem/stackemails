const DOCS = [
  {
    title: "Penetration test",
    body: "Penetration testing is performed at least annually by a third-party cybersecurity company. You can download the Letter of Attestation below.",
  },
  {
    title: "SOC 2",
    body: "NanoSend is SOC 2 Type II compliant, a compliance framework developed by AICPA. This audit covers the period of Feb 1, 2025 to Feb 1, 2026.",
  },
  {
    title: "DPA",
    body: "A Data Processing Agreement (DPA) regulates data processing conducted for business purposes. The attached DPA is considered fully executed once you sign up.",
  },
  {
    title: "Form W-9",
    body: "Form W-9 is used in the United States to provide a taxpayer identification number (TIN). You can download the signed Form W-9 below.",
  },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-4">
      {DOCS.map((d) => (
        <div key={d.title} className="card p-6">
          <h2 className="font-semibold">{d.title}</h2>
          <p className="text-sm text-fg-muted mt-2 max-w-2xl">{d.body}</p>
          <button className="btn btn-secondary mt-4">Download</button>
        </div>
      ))}
    </div>
  );
}
