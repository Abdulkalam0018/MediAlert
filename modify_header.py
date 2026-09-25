import re

with open("frontend/src/components/Dashboard/DashboardHeader.jsx", "r") as f:
    content = f.read()

# Add History icon
content = content.replace('Calendar, Plus, CheckCircle2, Clock', 'Calendar, Plus, CheckCircle2, Clock, History')

# Add handleHistory
content = content.replace('  const handleAddMedication = () => {', '  const handleHistory = () => {\n    navigate("/history");\n  };\n\n  const handleAddMedication = () => {')

# Add button
btn = """        <button
          type="button"
          className="dashboard-calendar-btn"
          onClick={handleHistory}
        >
          <History size={17} />
          <span>Dose History</span>
        </button>

        <button
          type="button"
          className="dashboard-add-btn\""""

content = content.replace('<button\n          type="button"\n          className="dashboard-add-btn"', btn)

with open("frontend/src/components/Dashboard/DashboardHeader.jsx", "w") as f:
    f.write(content)
