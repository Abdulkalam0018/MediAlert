import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Plus, Trash2, Edit2, ArrowLeft, X, Save, Clock, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "../../api/axiosInstance.js";
import { socket } from "../../socket.js";
import "./Medications.css";

const Medications = () => {
  const navigate = useNavigate();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State for Adding Medication
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "Daily",
    timings: [""],
    startDate: "",
    endDate: "",
  });

  // Modal & Form State for Editing/Updating Medication
  const [editingMed, setEditingMed] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    dosage: "",
    frequency: "Daily",
    timings: [""],
    startDate: "",
    endDate: "",
  });

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/elixirs/?status=${statusFilter}`);
      setMedications(response.data);
    } catch (error) {
      console.error("Error fetching medications:", error);
      toast.error("Failed to load medications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();

    const handleTrackUpdated = (data) => {
      console.log("Real-time update in Medications page:", data);
      fetchMedications();
    };

    socket.on("trackUpdated", handleTrackUpdated);

    return () => {
      socket.off("trackUpdated", handleTrackUpdated);
    };
  }, [statusFilter]);

  // --- Add Form Timing Handlers ---
  const handleAddTiming = () => {
    setFormData((prev) => ({
      ...prev,
      timings: [...prev.timings, ""],
    }));
  };

  const handleRemoveTiming = (index) => {
    if (formData.timings.length > 1) {
      setFormData((prev) => ({
        ...prev,
        timings: prev.timings.filter((_, i) => i !== index),
      }));
    }
  };

  const handleTimingChange = (index, value) => {
    const newTimings = [...formData.timings];
    newTimings[index] = value;
    setFormData((prev) => ({
      ...prev,
      timings: newTimings,
    }));
  };

  // --- Edit Form Timing Handlers ---
  const handleAddEditTiming = () => {
    setEditFormData((prev) => ({
      ...prev,
      timings: [...prev.timings, ""],
    }));
  };

  const handleRemoveEditTiming = (index) => {
    if (editFormData.timings.length > 1) {
      setEditFormData((prev) => ({
        ...prev,
        timings: prev.timings.filter((_, i) => i !== index),
      }));
    }
  };

  const handleEditTimingChange = (index, value) => {
    const newTimings = [...editFormData.timings];
    newTimings[index] = value;
    setEditFormData((prev) => ({
      ...prev,
      timings: newTimings,
    }));
  };

  
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };

  // Open Edit Modal with Pre-filled Data
  const handleOpenEditModal = (med) => {
    setEditingMed(med);

    // Convert Date objects or ISO strings to HH:MM format for the time inputs
    const formattedTimings =
      med.timings && med.timings.length > 0
        ? med.timings.map((t) => {
            const d = new Date(t);
            if (isNaN(d.getTime())) return "";
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            return `${hours}:${minutes}`;
          })
        : [""];

        setEditFormData({
      name: med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "Daily",
      timings: formattedTimings.length > 0 ? formattedTimings : [""],
      startDate: formatDateForInput(med.startDate),
      endDate: formatDateForInput(med.endDate),
    });
  };

  // Close Edit Modal
  const handleCloseEditModal = () => {
    setEditingMed(null);
  };

  // Submit Handler: Add Medication
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validTimings = formData.timings.filter((t) => t.trim() !== "");

    if (!formData.name.trim() || !formData.dosage.trim() || validTimings.length === 0) {
      toast.error("Please fill in medication name, dosage, and at least one time.");
      return;
    }

    try {
      setIsSubmitting(true);
            const medicationData = {
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequency,
        timings: validTimings,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      const response = await axiosInstance.post("/elixirs/add", medicationData);
      const newMed = response.data.elixir;

      setMedications((prev) => [newMed, ...prev]);
      setFormData({ name: "", dosage: "", frequency: "Daily", timings: [""], startDate: "", endDate: "" });
      toast.success(`${newMed.name} added successfully!`);
    } catch (error) {
      console.error("Error adding medication:", error);
      toast.error("Failed to add medication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Handler: Update Medication
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();

    if (!editingMed) return;

    const validTimings = editFormData.timings.filter((t) => t.trim() !== "");

    if (!editFormData.name.trim() || !editFormData.dosage.trim() || validTimings.length === 0) {
      toast.error("Please fill in medication name, dosage, and at least one time.");
      return;
    }

    try {
      setIsUpdating(true);
            const updatedData = {
        name: editFormData.name.trim(),
        dosage: editFormData.dosage.trim(),
        frequency: editFormData.frequency,
        timings: validTimings,
        startDate: editFormData.startDate || undefined,
        endDate: editFormData.endDate || undefined,
      };

      const response = await axiosInstance.put(`/elixirs/update/${editingMed._id}`, updatedData);
      const updatedMed = response.data.elixir;

      setMedications((prev) =>
        prev.map((med) => (med._id === editingMed._id ? updatedMed : med))
      );

      toast.success(`${updatedMed.name} updated successfully!`);
      handleCloseEditModal();
    } catch (error) {
      console.error("Error updating medication:", error);
      toast.error("Failed to update medication. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Handler: Remove Medication
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axiosInstance.post(`/elixirs/toggle/${id}`);
      toast.success(currentStatus === "active" ? "Medication marked as completed." : "Medication reactivated.");
      fetchMedications();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name || "this medication"}?`)) {
      return;
    }

    try {
      await axiosInstance.delete(`/elixirs/${id}`);
      setMedications((prev) => prev.filter((med) => med._id !== id));
      toast.success(`${name || "Medication"} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting medication:", error);
      toast.error("Failed to delete medication. Please try again.");
    }
  };

  return (
    <div className="medications-container">
      {/* Header */}
      <header className="medications-header">
        <div className="header-inner">
          <div className="header-title">
            <div className="header-icon">
              <Pill className="header-pill" />
            </div>
            <h1 className="header-text">My Medications</h1>
          </div>
          <div className="calendar-btn">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="medications-main">
        <div className="medications-grid">
          {/* Add Form */}
          <Card className="add-card">
            <div className="add-header">
              <div className="add-icon">
                <Plus className="w-5 h-5" style={{ color: "white" }} />
              </div>
              <h2 className="add-title">Add Medication</h2>
            </div>

            <form onSubmit={handleSubmit} className="add-form">
              <div className="form-group">
                <Label htmlFor="name">Medication Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Metformin, Aspirin"
                  required
                />
              </div>

              <div className="form-group">
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  value={formData.dosage}
                  onChange={(e) =>
                    setFormData({ ...formData, dosage: e.target.value })
                  }
                  placeholder="e.g., 500mg, 1 tablet"
                  required
                />
              </div>

              <div className="form-group">
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value })
                  }
                  className="select-input"
                >
                  <option value="Daily">Daily</option>
                  <option value="Alternate">Alternate Days</option>
                  <option value="Every3Days">Every 3 Days</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div className="form-group">
                
                <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input
                      type="date"
                      id="start-date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Label htmlFor="end-date">End Date</Label>
                    <Input
                      type="date"
                      id="end-date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <Label>Scheduled Timings *</Label>
                {formData.timings.map((timing, index) => (
                  <div
                    key={index}
                    className="timing-input-group"
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginBottom: "8px",
                      alignItems: "center",
                    }}
                  >
                    <Input
                      type="time"
                      value={timing}
                      onChange={(e) => handleTimingChange(index, e.target.value)}
                      style={{ flex: 1 }}
                      required={index === 0}
                    />
                    {formData.timings.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTiming(index)}
                        style={{ flexShrink: 0 }}
                        className="remove-timing-btn"
                        title="Remove time"
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddTiming}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Another Time
                </Button>
              </div>

              <Button
                type="submit"
                className="add-btn"
                size="lg"
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isSubmitting ? "Adding..." : "Add Medication"}
              </Button>
            </form>
          </Card>

                    {/* Medications List */}
          <div className="list-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 className="list-title" style={{ margin: 0 }}>
                {statusFilter === "active" ? "Your Medications" : "Medicine History"} ({medications.length})
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button 
                  variant={statusFilter === "active" ? "default" : "outline"} 
                  onClick={() => setStatusFilter("active")}
                  size="sm"
                >
                  Active
                </Button>
                <Button 
                  variant={statusFilter === "all" ? "default" : "outline"} 
                  onClick={() => setStatusFilter("all")}
                  size="sm"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Medicine History
                </Button>
              </div>
            </div>

            {loading ? (
              <p style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                Loading medications...
              </p>
            ) : medications.length === 0 ? (
              <Card className="empty-card">
                <Pill className="empty-icon" />
                <h3 className="empty-title">No medications yet</h3>
                <p className="empty-text">
                  Add your first medication using the form on the left
                </p>
              </Card>
            ) : (
              <div className="med-list">
                {medications.map((med, index) => (
                  <Card
                    key={med._id}
                    className="med-card"
                    style={{ animationDelay: `${index * 0.08}s` }}
                  >
                    <div className="med-item">
                      <div className="med-left">
                        <div className="med-icon">
                          <Pill className="w-6 h-6" style={{ color: "white" }} />
                        </div>
                        <div>
                          <h3 className="med-name">{med.name}</h3>
                          <div className="med-details">
                            <p>
                              <b>Dosage:</b> {med.dosage}
                            </p>
                            <p>
                              <b>Frequency:</b> {med.frequency}
                            </p>
                                                        <p>
                              <b>Duration:</b> {med.startDate ? new Date(med.startDate).toLocaleDateString() : "N/A"} - {med.endDate ? new Date(med.endDate).toLocaleDateString() : "Ongoing"}
                            </p>
                            <p>
                              {med.status === "completed" && <b style={{color:"#dc2626"}}>Completed</b>}
                            </p>
                            <p>
                              {med.timings && med.timings.length > 0 ? (
                                <>
                                  <b>Timings:</b>{" "}
                                  {med.timings.map((time, idx) => (
                                    <span key={idx}>
                                      {new Date(time).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      {idx < med.timings.length - 1 && ", "}
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span>No specific timings</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="med-actions">
                        <Button
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
                          onClick={() => handleOpenEditModal(med)}
                          title="Update Medication"
                        >
                          <Edit2 className="w-4 h-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(med._id, med.name)}
                          title="Delete Medication"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- EDIT MEDICATION MODAL --- */}
      {editingMed && (
        <div className="modal-overlay" onClick={handleCloseEditModal}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon-badge">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="modal-title">Update Medication</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={handleCloseEditModal}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit}>
              <div className="modal-body add-form">
                <div className="form-group">
                  <Label htmlFor="edit-name">Medication Name *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    placeholder="e.g., Metformin"
                    required
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="edit-dosage">Dosage *</Label>
                  <Input
                    id="edit-dosage"
                    value={editFormData.dosage}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, dosage: e.target.value })
                    }
                    placeholder="e.g., 500mg"
                    required
                  />
                </div>

                <div className="form-group">
                  <Label htmlFor="edit-frequency">Frequency</Label>
                  <select
                    id="edit-frequency"
                    value={editFormData.frequency}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, frequency: e.target.value })
                    }
                    className="select-input"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Alternate">Alternate Days</option>
                    <option value="Every3Days">Every 3 Days</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div className="form-group">
                  
                <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <Label htmlFor="edit-start-date">Start Date</Label>
                    <Input
                      type="date"
                      id="edit-start-date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Label htmlFor="edit-end-date">End Date</Label>
                    <Input
                      type="date"
                      id="edit-end-date"
                      value={editFormData.endDate}
                      onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                  <Label>Scheduled Timings *</Label>
                  {editFormData.timings.map((timing, index) => (
                    <div
                      key={index}
                      className="timing-input-group"
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "8px",
                        alignItems: "center",
                      }}
                    >
                      <Input
                        type="time"
                        value={timing}
                        onChange={(e) =>
                          handleEditTimingChange(index, e.target.value)
                        }
                        style={{ flex: 1 }}
                        required={index === 0}
                      />
                      {editFormData.timings.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveEditTiming(index)}
                          style={{ flexShrink: 0 }}
                          title="Remove time"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddEditTiming}
                    className="mt-2"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Time
                  </Button>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleCloseEditModal}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-save"
                  disabled={isUpdating}
                >
                  <Save className="w-4 h-4" />
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medications;
