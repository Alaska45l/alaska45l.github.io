import json
import sys

def merge_json(target_path, source_path, group=None):
    with open(target_path, 'r', encoding='utf-8') as f:
        target = json.load(f)
    
    with open(source_path, 'r', encoding='utf-8') as f:
        source = json.load(f)
    
    # Merge meta
    if "meta" in source and "invariant" in source["meta"]:
        target["meta"]["invariant"] = source["meta"]["invariant"]
    
    # Merge home.projects
    if "home" in source and "projects" in source["home"] and "invariant" in source["home"]["projects"]:
        target["home"]["projects"]["invariant"] = source["home"]["projects"]["invariant"]
    
    # Merge invariant root
    if "invariant" in source:
        target["invariant"] = source["invariant"]
    
    with open(target_path, 'w', encoding='utf-8') as f:
        json.dump(target, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    lang = sys.argv[1]
    if lang == "es":
        # For es, we use invariant_i18n.json (first part)
        # Actually I already merged meta and home.projects partially.
        # I'll just merge everything from invariant_i18n.json
        with open('Integrar/invariant_i18n.json', 'r', encoding='utf-8') as f:
            content = f.read()
            # Split by comments if needed, but the file has both es and en
            # Wait, the file is not valid JSON because it has two objects and comments.
            pass
    
    # I'll just write the final es.json and en.json since I have the content.
