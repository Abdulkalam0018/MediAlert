import re

with open("frontend/src/pages/Medication/Medications.jsx", "r") as f:
    content = f.read()

# Add handleToggleStatus function
toggle_func = """  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axiosInstance.post(`/elixirs/toggle/${id}`);
      toast.success(currentStatus === "active" ? "Medication marked as completed." : "Medication reactivated.");
      fetchMedications();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id, name) => {"""
content = content.replace('  const handleDelete = async (id, name) => {', toggle_func)

# Add Toggle icon to imports
content = content.replace('Pill, Plus, Trash2, Edit2, ArrowLeft, X, Save, Clock', 'Pill, Plus, Trash2, Edit2, ArrowLeft, X, Save, Clock, CheckCircle2, RotateCcw')

# Add Toggle button in actions
toggle_btn = """                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(med._id, med.status)}
                          title={med.status === "active" ? "Mark Complete" : "Reactivate"}
                        >
                          {med.status === "active" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-orange-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(med)}"""
content = content.replace('                        <Button\n                          variant="ghost"\n                          size="icon"\n                          onClick={() => handleOpenEditModal(med)}', toggle_btn)

with open("frontend/src/pages/Medication/Medications.jsx", "w") as f:
    f.write(content)

