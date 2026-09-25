import re

with open("frontend/src/App.jsx", "r") as f:
    content = f.read()

# Add import
content = content.replace(
    'import Medications from "./pages/Medication/Medications";',
    'import Medications from "./pages/Medication/Medications";\nimport DoseHistory from "./pages/History/DoseHistory";'
)

# Add route
route = """        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <DoseHistory />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />"""

content = content.replace('<Route path="*" element={<Navigate to="/" replace />} />', route)

with open("frontend/src/App.jsx", "w") as f:
    f.write(content)
