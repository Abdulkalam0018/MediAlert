import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Plus, Trash2, Edit2, ArrowLeft, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axiosInstance from "../../api/axiosInstance.js"
import "./Medications.css"; // ✅ external CSS

const Medications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [medications, setMedications] = useState([])

  useEffect(() => {
    const fetchMedications = async () => {
      try {
        const response = await axiosInstance.get("/elixirs/");
        setMedications(response.data);
      } catch (error) {
        console.error("Error fetching medications:", error);
      }
    };

    fetchMedications();
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "Daily",
    timings: [""],
  });

  const handleAddTiming = () => {
    setFormData({
      ...formData,
      timings: [...formData.timings, ""]
    });
  };

  const handleRemoveTiming = (index) => {
    if (formData.timings.length > 1) {
      const newTimings = formData.timings.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        timings: newTimings
      });
    }
  };

  const handleTimingChange = (index, value) => {
    const newTimings = [...formData.timings];
    newTimings[index] = value;
    setFormData({
      ...formData,
      timings: newTimings
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filter out empty timings
    
    const validTimings = formData.timings.filter(timing => timing.trim() !== "");
    
    if (!formData.name || !formData.dosage || validTimings.length === 0) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields including at least one timing",
        variant: "destructive",
      });
      return;
    }

    try {
      const medicationData = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        timings: validTimings,
      };

      const response = await axiosInstance.post("/elixirs/add", medicationData);
      setMedications([...medications, response.data.elixir]);
      setFormData({ name: "", dosage: "", frequency: "Daily", timings: [""] });
      toast({
        title: "Medication added",
        description: `${medicationData.name} has been added to your list`,
      });
    } catch (error) {
      console.error("Error adding medication:", error);
      toast({
        title: "Error",
        description: "Failed to add medication. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosInstance.delete(`/elixirs/${id}`);
      setMedications(medications.filter((med) => med._id !== id));
      toast({
        title: "Medication removed",
        description: "The medication has been deleted",
      });
    } catch (error) {
      console.error("Error deleting medication:", error);
      toast({
        title: "Error",
        description: "Failed to delete medication. Please try again.",
        variant: "destructive",
      });
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
          </div >
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
                <Plus className="w-5 h-5" style={{ color: 'white' }} />
              </div>
              <h2 className="add-title" >Add Medication</h2>
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
                  placeholder="e.g., Aspirin"
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
                  placeholder="e.g., 100mg"
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
                  <option value="Alternate">Alternate</option>
                  <option value="Weekly">Weekly</option>
                </select>
              </div>

              <div className="form-group">
                <Label>Timings *</Label>
                {
                  formData.timings.map((timing, index) => (
                  <div key={index} className="timing-input-group" style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <Input
                      type="time"
                      value={timing}
                      onChange={(e) => handleTimingChange(index, e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {formData.timings.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveTiming(index)}
                        style={{ flexShrink: 0}}
                        className="remove-timing-btn"
                      >
                        <X className="select-input" />
                      </Button>
                    )
                  }
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

              <Button type="submit" className="add-btn" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Medication
              </Button>
            </form>
          </Card>

          {/* Medications List */}
          <div className="list-container">
            <h2 className="list-title">
              Your Medications ({medications.length})
            </h2>

            {medications.length === 0 ? (
              <Card className="empty-card">
                <Pill className="empty-icon" />
                <h3 className="empty-title">No medications yet</h3>
                <p className="empty-text">
                  Add your first medication using the form
                </p>
              </Card>
            ) : (
              <div className="med-list">
                {medications.map((med, index) => (
                  <Card
                    key={med._id}
                    className="med-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="med-item">
                      <div className="med-left">
                        <div className="med-icon">
                          <Pill className="w-6 h-6" style={{ color: 'white' }} />
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
                              {med.timings && med.timings.length > 0 ? (
                                <>
                                  <b>Timings:</b>{" "}
                                  {med.timings.map((time, index) => (
                                    <span key={index}>
                                      {time}
                                      {index < med.timings.length - 1 && ", "}
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
                        <Button variant="ghost" size="icon">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(med._id)}
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
    </div>
  );
};

export default Medications;
