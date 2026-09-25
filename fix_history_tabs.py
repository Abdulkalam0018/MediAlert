import re

with open("frontend/src/pages/Medication/Medications.jsx", "r") as f:
    content = f.read()

# We will replace <div className="list-container"> to add our tabs inside it
tabs_ui = """          {/* Medications List */}
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
            </div>"""

content = re.sub(
    r'\{\/\* Medications List \*\/\}\s*<div className="list-container">\s*<h2 className="list-title">[\s\S]*?<\/h2>',
    tabs_ui,
    content
)

with open("frontend/src/pages/Medication/Medications.jsx", "w") as f:
    f.write(content)

