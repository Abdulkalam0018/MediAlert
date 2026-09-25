import re

with open("frontend/src/pages/Medication/Medications.jsx", "r") as f:
    content = f.read()

# Add activeFilter state
content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  const [statusFilter, setStatusFilter] = useState("active");')

# Update fetchMedications
content = content.replace('const response = await axiosInstance.get("/elixirs/");', 'const response = await axiosInstance.get(`/elixirs/?status=${statusFilter}`);')

# Update useEffect to depend on statusFilter
content = content.replace('}, []);', '}, [statusFilter]);')

# Add startDate and endDate to formData
content = content.replace('frequency: "Daily",\n    timings: [""],', 'frequency: "Daily",\n    timings: [""],\n    startDate: "",\n    endDate: "",')

# Helper to format date for input
format_helper = """
  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  };
"""
content = content.replace('// Open Edit Modal with Pre-filled Data', format_helper + '\n  // Open Edit Modal with Pre-filled Data')

# Update setEditFormData in handleOpenEditModal
set_edit_form = """    setEditFormData({
      name: med.name || "",
      dosage: med.dosage || "",
      frequency: med.frequency || "Daily",
      timings: formattedTimings.length > 0 ? formattedTimings : [""],
      startDate: formatDateForInput(med.startDate),
      endDate: formatDateForInput(med.endDate),
    });"""
content = re.sub(r'setEditFormData\(\{[\s\S]*?\}\);', set_edit_form, content, count=1)

# Add payload to handleUpdateSubmit
updated_data = """      const updatedData = {
        name: editFormData.name.trim(),
        dosage: editFormData.dosage.trim(),
        frequency: editFormData.frequency,
        timings: validTimings,
        startDate: editFormData.startDate || undefined,
        endDate: editFormData.endDate || undefined,
      };"""
content = re.sub(r'const updatedData = \{[\s\S]*?\};', updated_data, content, count=1)

# Add payload to handleSubmit
add_data = """      const medicationData = {
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        frequency: formData.frequency,
        timings: validTimings,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };"""
content = re.sub(r'const medicationData = \{[\s\S]*?\};', add_data, content, count=1)

# Add clear formData for startDate/endDate
content = content.replace('setFormData({ name: "", dosage: "", frequency: "Daily", timings: [""] });', 'setFormData({ name: "", dosage: "", frequency: "Daily", timings: [""], startDate: "", endDate: "" });')

# Add display for startDate and endDate in the list
display_dates = """                            <p>
                              <b>Duration:</b> {med.startDate ? new Date(med.startDate).toLocaleDateString() : "N/A"} - {med.endDate ? new Date(med.endDate).toLocaleDateString() : "Ongoing"}
                            </p>
                            <p>
                              {med.status === "completed" && <b style={{color:"#dc2626"}}>Completed</b>}
                            </p>"""
content = content.replace('<p>\n                              {med.timings && med.timings.length > 0 ? (', display_dates + '\n                            <p>\n                              {med.timings && med.timings.length > 0 ? (')

# Add toggle for Status Filter in the list header
header_filter = """            <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="section-title">Your Medications</h2>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-input" 
                style={{ width: 'auto', padding: '0.25rem 0.5rem', marginBottom: '0.5rem' }}
              >
                <option value="active">Active</option>
                <option value="all">All History</option>
              </select>
            </div>"""
content = content.replace('<h2 className="section-title">Your Medications</h2>', header_filter)

# Add startDate and endDate inputs in Add Form
add_dates_inputs = """
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
"""
content = content.replace('<Label>Scheduled Timings *</Label>\n                {formData.timings.map', add_dates_inputs + '\n                <Label>Scheduled Timings *</Label>\n                {formData.timings.map', 1)

# Add startDate and endDate inputs in Edit Form
edit_dates_inputs = """
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
"""
content = content.replace('<Label>Scheduled Timings *</Label>\n                  {editFormData.timings.map', edit_dates_inputs + '\n                  <Label>Scheduled Timings *</Label>\n                  {editFormData.timings.map', 1)

with open("frontend/src/pages/Medication/Medications.jsx", "w") as f:
    f.write(content)

