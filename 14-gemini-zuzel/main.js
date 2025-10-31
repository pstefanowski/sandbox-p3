class Example extends Phaser.Scene
{
    create ()
    {
        this.matter.world.setBounds(0, 0, 1200, 800);

        // Ustawienia toru
        const centerX = 600;
        const centerY = 400;
        const straightLength = 500;
        const trackLaneWidth = 160;
        const radiusTrack = 300;

        // Funkcja pomocnicza do tworzenia ścieżki toru
        const createTrackPath = (radius) => {
            const path = new Phaser.Curves.Path();
            const halfStraight = straightLength / 2;

            // Górna prosta
            path.add(new Phaser.Curves.Line(new Phaser.Math.Vector2(centerX - halfStraight, centerY - radius), new Phaser.Math.Vector2(centerX + halfStraight, centerY - radius)));
            // Prawy łuk
            path.add(new Phaser.Curves.Ellipse(centerX + halfStraight, centerY, radius, radius, 270, 90, false));
            // Dolna prosta
            path.add(new Phaser.Curves.Line(new Phaser.Math.Vector2(centerX + halfStraight, centerY + radius), new Phaser.Math.Vector2(centerX - halfStraight, centerY + radius)));
            // Lewy łuk
            path.add(new Phaser.Curves.Ellipse(centerX - halfStraight, centerY, radius, radius, 90, 270, false));

            return path;
        };

        const createTrackPathAlternative = (radius) => {
            const path = new Phaser.Curves.Path();
            const halfStraight = straightLength / 2;

            return path;
        }

        // Tworzymy ścieżki dla zewnętrznej i wewnętrznej krawędzi toru
        const outerPath = createTrackPath(radiusTrack);
        const innerPath = createTrackPath(radiusTrack - trackLaneWidth);

        // Pobieramy punkty ze ścieżek
        const outerPoints = outerPath.getPoints(64);
        const innerPoints = innerPath.getPoints(64);

        // Znajdź środek geometryczny dla wierzchołków
        const outerCenter = Phaser.Physics.Matter.Matter.Vertices.centre(outerPoints);
        const innerCenter = Phaser.Physics.Matter.Matter.Vertices.centre(innerPoints);

        // Tworzymy ściany z punktów
        // Zewnętrzna ściana
        this.matter.add.fromVertices(outerCenter.x, outerCenter.y, outerPoints, {
            isStatic: true,
            render: {
                fillStyle: '#444444',
                strokeStyle: '#FFFFFF',
                lineWidth: 2
            }
        });

        // Wewnętrzna ściana
        this.matter.add.fromVertices(innerCenter.x, innerCenter.y, innerPoints, {
            isStatic: true,
            render: {
                fillStyle: '#444444',
                strokeStyle: '#FFFFFF',
                lineWidth: 2
            }
        });

        // Wypełnienie toru
        const graphics = this.add.graphics();
        graphics.fillStyle(0x8B4513, 1); // Kolor brązowy, jak nawierzchnia żużlowa

        // Rysujemy zewnętrzną elipsę i wycinamy wewnętrzną
        graphics.fillPoints(outerPoints, true);
        graphics.fillPoints(innerPoints, true);

        // Wypełnienie środka toru
        graphics.fillStyle(0x008000, 1); // Zielony
        graphics.fillPoints(innerPoints, true);

        // Przesuwamy grafikę na spód, żeby nie przysłaniała ciał fizycznych
        this.children.sendToBack(graphics);
    }
}

const config = {
    type: Phaser.WEBGL,
    width: 1200,
    height: 800,
    parent: 'phaser-example',
    pixelArt: true,
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 },
            debug: true
        }
    },
    scene: Example
};

const game = new Phaser.Game(config);
