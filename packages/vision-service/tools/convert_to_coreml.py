#!/usr/bin/env python3
"""
Core ML Model Converter
Konvertiert PyTorch, ONNX oder TensorFlow Lite Models zu Core ML Format
"""

import argparse
import sys
import os
from pathlib import Path

try:
    import coremltools as ct
except ImportError:
    print("❌ coremltools nicht installiert!")
    print("Installieren mit: pip install coremltools")
    sys.exit(1)

def convert_onnx_to_coreml(input_path: str, output_path: str, model_name: str, input_shape: tuple = (1, 3, 224, 224)):
    """Konvertiert ONNX Model zu Core ML"""
    print(f"🔄 Konvertiere ONNX Model: {input_path}")
    
    try:
        model = ct.convert(
            input_path,
            source="onnx",
            inputs=[ct.TensorType(name="image", shape=input_shape)]
        )
        
        # Model-Metadaten setzen
        model.author = "PrismVid"
        model.short_description = f"{model_name} for PrismVid Vision Service"
        model.version = "1.0"
        
        # Speichern
        model.save(output_path)
        print(f"✅ Core ML Model gespeichert: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Fehler bei Konvertierung: {e}")
        return False

def convert_pytorch_to_coreml(input_path: str, output_path: str, model_name: str, input_shape: tuple = (1, 3, 224, 224)):
    """Konvertiert PyTorch Model zu Core ML"""
    print(f"🔄 Konvertiere PyTorch Model: {input_path}")
    
    try:
        import torch
        
        # Model laden (angenommen es ist ein state_dict oder komplettes Model)
        # Hier muss der Code angepasst werden basierend auf dem spezifischen Model
        
        # Beispiel für ein Standard-Image-Classification-Model
        model = ct.convert(
            input_path,
            source="pytorch",
            inputs=[ct.TensorType(name="image", shape=input_shape)],
            outputs=None  # Auto-detect
        )
        
        # Model-Metadaten setzen
        model.author = "PrismVid"
        model.short_description = f"{model_name} for PrismVid Vision Service"
        model.version = "1.0"
        
        # Speichern
        model.save(output_path)
        print(f"✅ Core ML Model gespeichert: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Fehler bei Konvertierung: {e}")
        print(f"💡 Hinweis: PyTorch Models benötigen oft spezifische Konvertierungs-Logik")
        return False

def convert_tflite_to_coreml(input_path: str, output_path: str, model_name: str, input_shape: tuple = (1, 3, 224, 224)):
    """Konvertiert TensorFlow Lite Model zu Core ML"""
    print(f"🔄 Konvertiere TensorFlow Lite Model: {input_path}")
    
    try:
        model = ct.convert(
            input_path,
            source="tflite",
            inputs=[ct.TensorType(name="image", shape=input_shape)]
        )
        
        # Model-Metadaten setzen
        model.author = "PrismVid"
        model.short_description = f"{model_name} for PrismVid Vision Service"
        model.version = "1.0"
        
        # Speichern
        model.save(output_path)
        print(f"✅ Core ML Model gespeichert: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Fehler bei Konvertierung: {e}")
        return False

def detect_model_format(file_path: str) -> str:
    """Erkennt das Format des Model-Files"""
    ext = Path(file_path).suffix.lower()
    
    if ext == ".onnx":
        return "onnx"
    elif ext in [".pt", ".pth"]:
        return "pytorch"
    elif ext == ".tflite":
        return "tflite"
    else:
        # Versuche Format durch File-Header zu erkennen
        with open(file_path, "rb") as f:
            header = f.read(16)
            if b"ONNX" in header:
                return "onnx"
            elif b"PK" in header[:2]:  # ZIP-basiert (PyTorch)
                return "pytorch"
        return "unknown"

def main():
    parser = argparse.ArgumentParser(
        description="Konvertiert ML Models zu Core ML Format für PrismVid"
    )
    parser.add_argument("input", help="Pfad zum Input-Model (ONNX, PyTorch, TFLite)")
    parser.add_argument("-o", "--output", help="Output-Pfad (.mlmodel)")
    parser.add_argument("-n", "--name", help="Model-Name (für Metadaten)")
    parser.add_argument("-f", "--format", choices=["onnx", "pytorch", "tflite", "auto"], 
                       default="auto", help="Input-Format (auto = automatisch erkennen)")
    parser.add_argument("--input-shape", nargs=4, type=int, default=[1, 3, 224, 224],
                       help="Input Shape [batch, channels, height, width] (default: 1 3 224 224)")
    
    args = parser.parse_args()
    
    # Input-Pfad validieren
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"❌ Input-File nicht gefunden: {input_path}")
        sys.exit(1)
    
    # Output-Pfad bestimmen
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = input_path.parent / f"{input_path.stem}.mlmodel"
    
    # Output-Verzeichnis erstellen
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Model-Name bestimmen
    model_name = args.name or input_path.stem
    
    # Format erkennen
    if args.format == "auto":
        model_format = detect_model_format(str(input_path))
        if model_format == "unknown":
            print(f"❌ Konnte Format nicht automatisch erkennen: {input_path}")
            print(f"💡 Bitte Format explizit mit -f angeben")
            sys.exit(1)
    else:
        model_format = args.format
    
    print(f"📦 Model-Format: {model_format}")
    print(f"📁 Input: {input_path}")
    print(f"📁 Output: {output_path}")
    print(f"🏷️  Name: {model_name}")
    
    # Input Shape
    input_shape = tuple(args.input_shape)
    print(f"📐 Input Shape: {input_shape}")
    print()
    
    # Konvertierung durchführen
    success = False
    if model_format == "onnx":
        success = convert_onnx_to_coreml(str(input_path), str(output_path), model_name, input_shape)
    elif model_format == "pytorch":
        success = convert_pytorch_to_coreml(str(input_path), str(output_path), model_name, input_shape)
    elif model_format == "tflite":
        success = convert_tflite_to_coreml(str(input_path), str(output_path), model_name, input_shape)
    else:
        print(f"❌ Unbekanntes Format: {model_format}")
        sys.exit(1)
    
    if success:
        print()
        print("✅ Konvertierung erfolgreich!")
        print(f"💡 Model kann jetzt in packages/vision-service/Models/ platziert werden")
        print(f"💡 Oder direkt kopieren mit: cp {output_path} packages/vision-service/Models/{model_name}.mlmodel")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()

