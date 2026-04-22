import os
import re

dirs_to_scan = [
    r'd:\Memory Palace UI\pixel-agents-main\src',
    r'd:\Memory Palace UI\pixel-agents-main\shared'
]

replacements = [
    # 1. Extensions
    (r'\.js([\'"])', r'\1'),
    (r'\.ts([\'"])', r'\1'),
    
    # 2. VSCode API
    (r"from '\.\./vscodeApi'", "from '@/lib/engine/vscodeApi'"),
    (r"from '\.\./\.\./vscodeApi'", "from '@/lib/engine/vscodeApi'"),
    (r"from '\./vscodeApi'", "from '@/lib/engine/vscodeApi'"),
    
    # 3. Components UI
    (r"from '\.\./\.\./components/ui/", "from '@/components/ui/"),
    (r"from '\.\./components/ui/", "from '@/components/ui/"),
    
    # 4. Constants
    (r"from '\.\./constants'", "from '@/lib/engine/constants'"),
    (r"from '\.\./\.\./constants'", "from '@/lib/engine/constants'"),
    
    # 5. Office -> Engine
    (r"from '\.\./office/", "from '@/lib/engine/"),
    (r"from '\.\./\.\./office/", "from '@/lib/engine/"),
    
    # 6. Shared
    (r"from '\.\./\.\./shared/", "from '@shared/"),
    (r"from '\.\./shared/", "from '@shared/"),
    
    # 7. Hooks
    (r"from '\.\./hooks/", "from '@/hooks/"),
    (r"from '\.\./\.\./hooks/", "from '@/hooks/"),
    (r"from '\.\./\.\./\.\./hooks/", "from '@/hooks/"),
    
    # 8. Engine Relative
    (r"from '\.\./layout/", "from '@/lib/engine/layout/"),
    (r"from '\.\./engine/", "from '@/lib/engine/engine/"),
    (r"from '\.\./sprites/", "from '@/lib/engine/sprites/"),
    (r"from '\.\./types'", "from '@/lib/engine/types'"),
    
    # 9. Runtime
    (r"from '\.\./runtime'", "from '@/lib/engine/runtime'"),
    (r"from '\./runtime'", "from '@/lib/engine/runtime'"),
]

for base_path in dirs_to_scan:
    print(f"Scanning {base_path}...")
    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    new_content = content
                    for pattern, repl in replacements:
                        new_content = re.sub(pattern, repl, new_content)
                    
                    if content != new_content:
                        with open(full_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Updated {full_path}")
                except Exception as e:
                    print(f"Error processing {full_path}: {e}")
