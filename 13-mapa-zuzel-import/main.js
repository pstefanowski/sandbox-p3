class Example extends Phaser.Scene
{
    constructor() {
        super();
        this.ship = null;
        this.cursors = null;
        this.map = null;
        this.graphics = null;
        this.wewCurve = null;
        this.zewCurve = null;

        this.MAP_WIDTH = 2645;
        this.MAP_HEIGHT = 1634;
    }

    preload ()
    {
        this.load.tilemapTiledJSON('map', 'assets/kreskizuzel_stastion_wro.json');
        this.load.image('ship', '../../assets/sprites/fmship.png');
    }

    create ()
    {
        this.cameras.main.setBounds(0, 0, this.MAP_WIDTH, this.MAP_HEIGHT);
        this.map = this.make.tilemap({ key: 'map' });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.ship = this.add.image(1000, 1200, 'ship').setAngle(90);

        this.cameras.main.startFollow(this.ship, true);
        this.cameras.main.setZoom(2);

        this.graphics = this.add.graphics();

        // Pobierz punkty z warstw obiektów w Tiled
        const wewPoints = this.getPointsFromTiledObjectLayer('wew');
        const zewPoints = this.getPointsFromTiledObjectLayer('zew');
        // Dla toru żużlowego wystarczą 4 punkty definiujące początki i końce łuków.
        // Tiled JSON ma 1 obiekt polygon na warstwę, więc bierzemy pierwszy.
        const wewTrackPoints = this.map.getObjectLayer('wew').objects[0];
        const zewTrackPoints = this.map.getObjectLayer('zew').objects[0];

        // Utwórz gładkie krzywe (Spline) z tych punktów
        this.wewCurve = new Phaser.Curves.Spline(wewPoints);
        this.zewCurve = new Phaser.Curves.Spline(zewPoints);
        // Utwórz idealne ścieżki toru
        this.wewCurve = this.createTrackPath(wewTrackPoints);
        this.zewCurve = this.createTrackPath(zewTrackPoints);

        // Narysuj tor
        this.drawTrack();
    }

    /**
     * Pobiera punkty z warstwy obiektów Tiled.
     * Zakłada, że obiekty na warstwie to polygony/polilinie.
     * @param {string} layerName - Nazwa warstwy obiektów w Tiled.
     * @returns {Phaser.Math.Vector2[]} Tablica punktów.
     * Tworzy idealną ścieżkę toru żużlowego (2 proste, 2 łuki) na podstawie 4 punktów z Tiled.
     * @param {object} tiledObject - Obiekt polygon z Tiled z 4 punktami.
     * @returns {Phaser.Curves.Path} Gotowa ścieżka toru.
     */
    getPointsFromTiledObjectLayer(layerName)
    createTrackPath(tiledObject)
    {
        const objects = this.map.getObjectLayer(layerName).objects;
        const points = [];
        objects.forEach(obj => {
            // Polygon/Polyline w Tiled ma punkty względne do pozycji obiektu
            const polyPoints = obj.polygon ? obj.polygon : obj.polyline;
            polyPoints.forEach(p => {
                points.push(new Phaser.Math.Vector2(obj.x + p.x, obj.y + p.y));
            });
        });
        // Punkty z Tiled powinny być zdefiniowane w następującej kolejności:
        // P1--Łuk1--P2
        // |         |
        // P4--Łuk2--P3
        const p = tiledObject.polygon.map(point => new Phaser.Math.Vector2(tiledObject.x + point.x, tiledObject.y + point.y));
        const [p1, p2, p3, p4] = p;

        // --- KLUCZOWA ZMIANA ---
        // Aby zamknąć krzywą Spline i uczynić ją gładką pętlą,
        // musimy dodać pierwszy punkt na koniec tablicy.
        if (points.length > 0) {
            points.push(points[0]);
        }
        // Obliczanie parametrów dla łuków (elips)
        const radiusX1 = (p2.x - p1.x) / 2;
        const radiusY1 = Math.abs(p4.y - p1.y) / 2; // Zakładamy symetrię
        const centerX1 = p1.x + radiusX1;
        const centerY1 = p1.y;

        return points;
        const radiusX2 = (p3.x - p4.x) / 2;
        const radiusY2 = Math.abs(p3.y - p2.y) / 2;
        const centerX2 = p4.x + radiusX2;
        const centerY2 = p4.y;

        const path = new Phaser.Curves.Path(p1.x, p1.y);

        // Łuk 1 (górny)
        path.add(new Phaser.Curves.Ellipse(centerX1, centerY1, radiusX1, radiusY1, 180, 360, false));

        // Prosta 1 (prawa)
        path.add(new Phaser.Curves.Line(p2, p3));

        // Łuk 2 (dolny)
        path.add(new Phaser.Curves.Ellipse(centerX2, centerY2, radiusX2, radiusY2, 0, 180, false));

        // Prosta 2 (lewa)
        path.add(new Phaser.Curves.Line(p4, p1));

        return path;
    }

    /**
     * Rysuje tor na podstawie zdefiniowanych krzywych.
     */
    drawTrack() {
        // Wewnętrzna krawędź
        this.graphics.lineStyle(1, 0x00ff00, 1);
        this.graphics.lineStyle(10, 0x00ff00, 1);
        this.wewCurve.draw(this.graphics, 64);

        // Zewnętrzna krawędź
        this.graphics.lineStyle(1, 0xff0000, 1);
        this.graphics.lineStyle(10, 0xff0000, 1);
        this.zewCurve.draw(this.graphics, 64);
    }

    update ()
    {
        const speed = 10;
        let moved = false;

        if (this.cursors.left.isDown)
        {
            this.ship.setAngle(-90);
            this.ship.x -= speed;
            moved = true;
        }
        else if (this.cursors.right.isDown)
        {
            this.ship.setAngle(90);
            this.ship.x += speed;
            moved = true;
        }

        if (this.cursors.up.isDown)
        {
            if (!moved) this.ship.setAngle(0);
            this.ship.y -= speed;
        }
        else if (this.cursors.down.isDown)
        {
            if (!moved) this.ship.setAngle(180);
            this.ship.y += speed;
        }

        // Ograniczenie pozycji statku do granic mapy
        this.ship.x = Phaser.Math.Clamp(this.ship.x, 0, this.MAP_WIDTH);
        this.ship.y = Phaser.Math.Clamp(this.ship.y, 0, this.MAP_HEIGHT);
    }
}

const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    backgroundColor: '#2d2d2d',
    parent: 'game-container',
    scene: Example,
};

const game = new Phaser.Game(config);
