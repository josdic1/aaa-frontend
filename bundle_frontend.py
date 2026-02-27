import os

# --- CONFIGURATION ---
# The logic trail: API -> Contexts -> Hooks -> Main Pages
FRONTEND_TRAIL = [
    "src/utils/api.js",
    "src/contexts/AuthContext.jsx",
    "src/contexts/DataContext.jsx",
    "src/providers/AuthProvider.jsx",
    "src/providers/DataProvider.jsx",
    "src/hooks/useData.jsx",
    "src/App.jsx",
    "src/router.jsx",
]

# Folders to prioritize
TARGET_DIRS = [
    "src/components",
    "src/pages",
]

# Strictly ignore these
SKIP_DIRS = {"node_modules", ".git", "dist", "build", "public"}
OUTPUT_FILE = "frontend_payload.txt"

def get_file_content(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"// Error reading file: {e}"

def bundle():
    processed_files = set()
    payloads = []

    # 1. Process the "Trail" First
    for f_path in FRONTEND_TRAIL:
        if os.path.exists(f_path):
            payloads.append((f_path, get_file_content(f_path)))
            processed_files.add(os.path.abspath(f_path))

    # 2. Process Target Directories (Components and Pages)
    for root_dir in TARGET_DIRS:
        if not os.path.exists(root_dir):
            continue
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
            
            for file in sorted(files):
                if file.endswith((".jsx", ".js")) and file != "index.js":
                    full_path = os.path.join(root, file)
                    abs_path = os.path.abspath(full_path)
                    
                    if abs_path not in processed_files:
                        payloads.append((full_path, get_file_content(full_path)))
                        processed_files.add(abs_path)

    # 3. Write to output
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
        out.write("⚛️ FRONTEND BUNDLE FOR REVIEW\n")
        out.write("="*50 + "\n\n")

        for i, (path, content) in enumerate(payloads):
            line_count = content.count('\n')
            warning = "⚠️ LARGE COMPONENT" if line_count > 250 else "✅ STABLE"
            
            out.write(f"--- BATCH {i+1} | {path} ---\n")
            out.write(f"STATUS: {warning} ({line_count} lines)\n")
            out.write(f"### FILE: {path}\n")
            out.write(f"```javascript\n{content}\n```\n")
            out.write("\n" + "="*50 + "\n\n")

    print(f"✨ Success! {len(payloads)} React files bundled into {OUTPUT_FILE}")

if __name__ == "__main__":
    bundle()