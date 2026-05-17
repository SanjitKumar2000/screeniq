import { ApplicationsTable } from "@/components/ApplicationsTable";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Past screenings</h1>
        <p className="text-sm text-gray-600">
          Server-paginated. Use the controls below to navigate.
        </p>
      </div>
      <ApplicationsTable />
    </div>
  );
}
