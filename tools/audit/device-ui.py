"""Interactions ADB limitées aux deux téléphones autorisés du banc USB."""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

serial, action, *values = sys.argv[1:]
if serial not in ("7HBYI7MVGYDYLFYS", "95QX212AA"):
    raise SystemExit("Téléphone du banc attendu")

def adb(*args):
    return subprocess.check_output(["adb", "-s", serial, *args], text=True)

def snapshot():
    result = adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/teko-alpha-ui.xml")
    if "dumped" not in result:
        raise SystemExit("Capture accessibilité non disponible ; ne pas utiliser une ancienne capture")
    return ET.fromstring(adb("shell", "cat", "/sdcard/teko-alpha-ui.xml"))

if action == "tap":
    root = snapshot()
    nodes = [n for n in root.iter("node") if values[0] in (n.get("resource-id"), n.get("text"), n.get("content-desc"))]
    nodes = [n for n in nodes if n.get("bounds") != "[0,0][0,0]"]
    if len(nodes) != 1:
        raise SystemExit(f"Contrôle visible unique attendu : {values[0]}")
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", nodes[0].get("bounds")))
    adb("shell", "input", "tap", str((x1+x2)//2), str((y1+y2)//2))
elif action in ("text", "replace"):
    if action == "replace":
        fields = [n for n in snapshot().iter("node") if n.get("focused") == "true" and "EditText" in n.get("class", "")]
        if len(fields) != 1:
            raise SystemExit("Champ de saisie focalisé unique attendu")
        adb("shell", "input", "keyevent", "KEYCODE_MOVE_END", *(["KEYCODE_DEL"] * len(fields[0].get("text", ""))))
    adb("shell", "input", "text", values[0].replace(" ", "%s"))
elif action != "snapshot":
    raise SystemExit("Action inconnue")
for node in snapshot().iter("node"):
    if not node.get("package", "").startswith(("ga.teko.", "com.android.permissioncontroller", "com.google.android.permissioncontroller")):
        continue
    if node.get("text") or node.get("resource-id") or node.get("content-desc"):
        print(node.get("resource-id", ""), node.get("text", ""), node.get("content-desc", ""), node.get("bounds"))
