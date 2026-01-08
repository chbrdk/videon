#!/usr/bin/env python3
"""
Erstellt Dummy Core ML Models für Testing
Diese Models sind Platzhalter, die die Struktur haben, aber keine echten Vorhersagen machen.
Nützlich zum Testen der Integration, bevor echte Models verfügbar sind.
"""

import sys
import os

def create_dummy_person_attributes():
    """Erstellt ein Dummy PersonAttributes Model"""
    try:
        # Versuche coremltools mit minimalem Import
        import coremltools.models as coreml
        from coremltools.models import datatypes
        from coremltools.models import neural_network
        
        # Einfaches MLModel erstellen
        from coremltools.models import MLModel
        
        # Input/Output definieren
        input_features = [('image', datatypes.Array(3, 224, 224))]
        output_features = [('output', datatypes.Array(2))]  # Age, Gender
        
        # Einfacher Neural Network Builder
        builder = neural_network.NeuralNetworkBuilder(input_features, output_features)
        
        # Einfache Layer hinzufügen (Placeholder)
        builder.add_convolution(
            name='conv1',
            kernel_channels=3,
            output_channels=64,
            kernel_size=[3, 3],
            stride=[1, 1],
            border_mode='same',
            groups=1,
            W=None,
            b=None,
            has_bias=True,
            is_deconv=False
        )
        
        # Model erstellen
        model = MLModel(builder.spec)
        model.author = "PrismVid (Dummy Model)"
        model.short_description = "Dummy Person Attributes Model for Testing"
        model.version = "1.0"
        
        output_path = os.path.join(os.path.dirname(__file__), "..", "Models", "PersonAttributes.mlmodel")
        model.save(output_path)
        
        print(f"✅ Dummy PersonAttributes.mlmodel erstellt: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Fehler beim Erstellen des Dummy Models: {e}")
        print("💡 Hinweis: coremltools hat Kompatibilitätsprobleme")
        return False

def create_simple_mlmodel():
    """Alternative: Erstellt ein sehr einfaches Core ML Model mit Standard-Tools"""
    try:
        # Versuche mit minimalem Core ML
        from coremltools import models
        import numpy as np
        
        # Erstelle ein einfaches Model-Prototyp
        # (Dieser Ansatz funktioniert möglicherweise auch nicht wegen der Import-Probleme)
        
        print("⚠️  Dummy Model Creation nicht möglich wegen coremltools Problemen")
        print("💡 Alternative: Verwende ONNX Models direkt oder warte auf coremltools Fix")
        return False
        
    except Exception as e:
        print(f"❌ Fehler: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Erstelle Dummy Core ML Models für Testing...")
    print("")
    
    if not create_dummy_person_attributes():
        print("")
        print("💡 Empfehlungen:")
        print("1. Verwende System OHNE Core ML Models (funktioniert bereits)")
        print("2. Warte auf coremltools Update für Python 3.14")
        print("3. Verwende Apple Create ML direkt (ohne Konvertierung)")
        print("4. Verwende ONNX Runtime als Alternative")
        sys.exit(1)


