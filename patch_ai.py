import re

with open("frontend/src/components/Dashboard/AIHealthAssistant.jsx", "r") as f:
    content = f.read()

# Add imports
content = content.replace(
    'import { askAI } from "../../api/ai";', 
    'import { askAI } from "../../api/ai";\nimport ReactMarkdown from "react-markdown";\nimport remarkGfm from "remark-gfm";'
)

# Replace <p style={{ margin: 0 }}>{message.text}</p>
new_render = """                        {isUser ? (
                          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{message.text}</p>
                        ) : (
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        )}"""

content = content.replace('<p style={{ margin: 0 }}>{message.text}</p>', new_render)

with open("frontend/src/components/Dashboard/AIHealthAssistant.jsx", "w") as f:
    f.write(content)
