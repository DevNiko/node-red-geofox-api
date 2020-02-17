# node-red-geofox-api

Dieses Node-Red Dashboard Plugin ermögklicht es aktuellen Abfahrtszeiten aller Linien einer Haltestelle abzufragen. Dafür wird ein API-Key von Geofox benötigt. Dieser kann individuell bei Geofox beantragt werden.

Dieses Plugin ist ein Hobby projekt und befindet sich in ständiger  Weiterentwicklung. Falls ihr Fehler findet oder Vorschläge für neue Funktionen habt, bitte erstellt ein Issue hier auf GitHub.

# Installation

Entweder über die Paketverwaltung von Node Red Dashboard oder über NPM Install. Das Paket heißt "node-red-contrib-geofox-api". Oder durch das Klonen dieses Repos und manuellem Hinzufügen zum ".node-red" Verzeichnisses eures Node-Red Servers.

Nach der Installation des Plugins erscheint in linken Menuleiste, unter "Funktionen" die neue Node "geofox api". Diese Node ist nur zuständig für das Abfragen der Daten von Geofox. Hier können auch individuelle Einstllungen vorgenommen werden. Wie z.b. Name der Haltestelle.

Für die Darstellung auf dem Dashboard wird noch eine Template Node benötigt. In der Datei "dashboard-template.html" stelle ich mein Beispiel zur Verfügung. Gerne ausprobieren und ggf. anpassen.
