import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Plus, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import "./Medications.css"; // ✅ external CSS

const Medications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [medications, setMedications] = useState([
    {
      id: "1",
      name: "Aspirin",
      dosage: "100mg",
      frequency: "Daily",
      time: "08:00",
    },
    {
      id: "2",
      name: "Metformin",
      dosage: "500mg",
      frequency: "Twice daily",
      time: "12:00",
    },
  ]);

  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "Daily",
    time: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage || !formData.time) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const newMed = {
      id: Date.now().toString(),
      ...formData,
    };

    setMedications([...medications, newMed]);
    setFormData({ name: "", dosage: "", frequency: "Daily", time: "" });
    toast({
      title: "Medication added",
      description: `${newMed.name} has been added to your list`,
    });
  };

  const handleDelete = (id) => {
    setMedications(medications.filter((med) => med.id !== id));
    toast({
      title: "Medication removed",
      description: "The medication has been deleted",
    });
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
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="medications-main">
        <div className="medications-grid">
          {/* Add Form */}
          <Card className="add-card">
            <div className="add-header">
              <div className="add-icon">
                <Plus className="w-5 h-5 text-primary-foreground" />
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
                  <option value="Twice daily">Twice daily</option>
                  <option value="Three times daily">Three times daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="As needed">As needed</option>
                </select>
              </div>

              <div className="form-group">
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                />
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
                    key={med.id}
                    className="med-card"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="med-item">
                      <div className="med-left">
                        <div className="med-icon">
                          <Pill className="w-6 h-6 text-primary-foreground" />
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
                              <b>Time:</b> {med.time}
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
                          onClick={() => handleDelete(med.id)}
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
