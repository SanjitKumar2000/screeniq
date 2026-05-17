import { ScreeningForm } from "@/components/ScreeningForm";

export default function ScreenPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Screen a candidate</h1>
        <p className="text-sm text-gray-600">
          Results stream in as the model generates them.
        </p>
      </div>
      <ScreeningForm />
    </div>
  );
}
