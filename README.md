# PDF Blätterkatalog – WordPress Plugin

## Installation

1. **Plugin hochladen**: Den Ordner `pdf-katalog-plugin` als ZIP-Datei unter *Plugins → Installieren → Plugin hochladen* installieren – oder den Ordner direkt nach `/wp-content/plugins/` kopieren.
2. **Plugin aktivieren**: Im WordPress-Admin unter *Plugins* aktivieren.
3. **PDF hochladen**: Gehe zu *Einstellungen → PDF Katalog*.
   - PDF über die Mediathek hochladen und die URL einfügen (oder den „PDF aus Mediathek wählen"-Button verwenden).
   - Das Inhaltsverzeichnis wird automatisch mit den Daten aus deiner Excel-Datei befüllt.
   - Optional: Akzentfarbe anpassen.
4. **Shortcode einbinden**: Auf einer beliebigen Seite oder in einem Beitrag den Shortcode einfügen:

```
[pdf_katalog]
```

## Features

| Feature | Details |
|---------|---------|
| **PDF-Viewer** | Basiert auf PDF.js – rendert jede Seite als Canvas |
| **Echtzeit-Suche** | Durchsucht Inhaltsverzeichnis UND extrahierten PDF-Text |
| **Akkordion-Inhaltsverzeichnis** | 9 Kapitel mit je klappbaren Unterregistern |
| **Seitennavigation** | Vor/Zurück, direkte Seiteneingabe |
| **Zoom** | Rein/Raus, automatisches Einpassen |
| **Vollbild-Modus** | Fullscreen API mit Fallback |
| **Responsive** | Mobil-optimiertes Layout |
| **Keyboard-Navigation** | Pfeiltasten, Home/End |
| **Dunkles Design** | Professionelles Dark-Theme |

## Inhaltsverzeichnis anpassen

Das JSON im Admin-Bereich hat folgendes Format:

```json
[
  {
    "chapter": "Kapitelname",
    "items": [
      { "title": "Unterregister-Titel", "page": 6 },
      { "title": "Weiterer Eintrag", "page": 14 }
    ]
  }
]
```

## Technische Hinweise

- **PDF.js Version**: 3.11.174 (CDN)
- **Keine externen Abhängigkeiten** außer PDF.js
- **Text-Extraktion** läuft im Hintergrund nach dem Laden
- **CORS**: Die PDF-Datei muss auf derselben Domain liegen (Mediathek) oder CORS-Header haben
