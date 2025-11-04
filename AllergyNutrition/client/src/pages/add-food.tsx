import { useState } from "react";
import FoodForm from "@/components/food-form";

export default function AddFoodView() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6 apple-shadow-lg border border-white/20">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: 'hsl(var(--apple-dark))' }}>
            Add New Food
          </h1>
          <p className="text-sm" style={{ color: 'hsl(var(--apple-medium))' }}>
            Create a new food item with custom scheduling and treatment instructions.
          </p>
        </div>

        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">Food added successfully!</p>
            <p className="text-green-600 text-sm">You can find it in the Manage Foods section to edit or view it on the calendar.</p>
          </div>
        )}

        <FoodForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}