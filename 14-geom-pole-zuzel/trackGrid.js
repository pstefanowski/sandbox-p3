/**
 * Komponent siatki toru (TrackGrid) dzielący owal żużlowy na segmenty wzdłuż toru oraz pasy poprzeczne.
 * Odpowiada za:
 * - Geometrię komórek (współrzędne torowe s, l)
 * - Modelowanie ewolucji nawierzchni (biegi 1 - 15)
 * - Wyznaczanie punktów optymalnej ścieżki (Optimal Racing Line)
 * - Renderowanie heatmapy i linii optymalnej w trybie debugowania
 */

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lerp = (a, b, t) => a + (b - a) * t;

export const GRID_MODES = {
    HEAT_1: { id: 'HEAT_1', heatNumber: 1, name: 'Bieg 1 (Czysty krawężnik)', desc: 'Twardo i równo, najszybsza najkrótsza linia przy krawężniku' },
    HEAT_5: { id: 'HEAT_5', heatNumber: 5, name: 'Bieg 5 (Dwie ścieżki)', desc: 'Chodzi krawężnik oraz zaczyna odsypywać się szeroka pod bandą' },
    HEAT_10: { id: 'HEAT_10', heatNumber: 10, name: 'Bieg 10 (Odsypana zewnętrzna)', desc: 'Dużo luźnego materiału pod bandą, szybka szeroka' },
    HEAT_15: { id: 'HEAT_15', heatNumber: 15, name: 'Bieg 15 (Pełna orbita)', desc: 'Krawężnik śliski jak lód, maksymalna prędkość pod samą bandą' },
    MIXED: { id: 'MIXED', heatNumber: 0, name: 'Mieszany (Łuki wąsko, proste szeroko)', desc: 'Pikowanie: łuki ścięte do krawężnika, na prostych noszenie pod bandę' }
};

export class TrackGrid {
    /**
     * @param {import('./track.js').Track} track - Instancja toru
     * @param {Object} [options] - Opcje konfiguracyjne siatki
     */
    constructor(track, options = {}) {
        this.track = track;
        this.segmentsPerSection = options.segmentsPerSection ?? 20; // 4 sekcje x 20 = 80 segmentów
        this.numSections = 4;
        this.totalSegments = this.numSections * this.segmentsPerSection;
        this.numLanes = options.numLanes ?? 10; // 10 pasów od krawężnika (0) do bandy (9)

        this.currentMode = 'HEAT_1';
        this.currentHeat = 1;

        // Inicjalizacja komórek [segmentIndex][laneIndex]
        this.cells = [];
        this.initCells();

        // Wyznaczenie początkowego rozkładu nawierzchni
        this.applyHeat(1);
    }

    /**
     * Inicjalizuje strukturę dwuwymiarowej siatki komórek
     */
    initCells() {
        this.cells = [];
        for (let s = 0; s < this.totalSegments; s++) {
            const row = [];
            for (let l = 0; l < this.numLanes; l++) {
                row.push({
                    s,
                    lane: l,
                    grip: 1.0,        // Mnożnik przyczepności (0.75 - 1.30)
                    dirt: 0.5,        // Ilość odsypanego materiału (0.0 - 1.0)
                    wear: 0.0         // Stopień wyślizgania (0.0 - 1.0)
                });
            }
            this.cells.push(row);
        }
    }

    /**
     * Ustawia stan toru dla danego numeru biegu (1 - 15) lub presetu
     * @param {number|string} heatOrPreset 
     */
    applyHeat(heatOrPreset) {
        if (typeof heatOrPreset === 'string' && GRID_MODES[heatOrPreset]) {
            this.currentMode = heatOrPreset;
            this.currentHeat = GRID_MODES[heatOrPreset].heatNumber;
        } else if (typeof heatOrPreset === 'number') {
            this.currentHeat = clamp(heatOrPreset, 1, 15);
            if (this.currentHeat <= 3) this.currentMode = 'HEAT_1';
            else if (this.currentHeat <= 7) this.currentMode = 'HEAT_5';
            else if (this.currentHeat <= 11) this.currentMode = 'HEAT_10';
            else this.currentMode = 'HEAT_15';
        } else if (heatOrPreset === 'MIXED') {
            this.currentMode = 'MIXED';
            this.currentHeat = 0;
        }

        this.recalculateGrip();
    }

    /**
     * Przelicza parametry komórek (grip, dirt) w oparciu o aktualny stan ewolucji toru
     */
    recalculateGrip() {
        const L = this.numLanes;

        for (let s = 0; s < this.totalSegments; s++) {
            const section = Math.floor(s / this.segmentsPerSection); // 0: prosta dół, 1: łuk prawy, 2: prosta góra, 3: łuk lewy
            const isArc = (section === 1 || section === 3);

            for (let l = 0; l < L; l++) {
                const laneRatio = l / (L - 1); // 0.0 = krawężnik, 1.0 = banda
                let grip = 1.0;
                let dirt = 0.5;

                if (this.currentMode === 'MIXED') {
                    // Tryb mieszany: łuki ciasno przy krawężniku, proste szeroko pod bandą
                    if (isArc) {
                        // Na łukach preferowany krawężnik (pas 0-2)
                        grip = 1.25 - (laneRatio * 0.45); // Od 1.25 (krawężnik) do 0.80 (banda)
                        dirt = 0.2 + (laneRatio * 0.8);
                    } else {
                        // Na prostych preferowana banda (pas 7-9)
                        grip = 0.85 + (laneRatio * 0.40); // Od 0.85 (krawężnik) do 1.25 (banda)
                        dirt = 0.8 - ((1 - laneRatio) * 0.6);
                    }
                } else if (this.currentMode === 'HEAT_5' || this.currentHeat === 5) {
                    // Bieg 5: 3 pasy żółte przy krawężniku, 4 zielone na środku, 3 czerwone przy bandzie
                    if (l <= 2) {
                        // 3 pasy przy krawężniku (pas 0, 1, 2) -> kolor żółty (grip 1.05 - 1.17)
                        grip = 1.14 - (l * 0.025); // 1.14, 1.115, 1.09
                        dirt = 0.3;
                    } else if (l >= 7) {
                        // 3 pasy przy bandzie (pas 7, 8, 9) -> kolor czerwony (grip >= 1.18)
                        grip = 1.18 + ((l - 7) * 0.04); // 1.18, 1.22, 1.26
                        dirt = 0.85;
                    } else {
                        // 4 pasy na środku toru (pas 3, 4, 5, 6) -> kolor zielony (grip 1.00)
                        grip = 1.00;
                        dirt = 0.5;
                    }
                } else {
                    // Ewolucja w trakcie meczu na podstawie numeru biegu (1 - 15)
                    const progress = clamp((this.currentHeat - 1) / 14, 0, 1); // 0.0 dla biegu 1, 1.0 dla biegu 15

                    // W biegu 1: krawężnik = 1.20, banda = 0.80
                    // W biegu 15: krawężnik = 0.75, banda = 1.30
                    const insideGrip = lerp(1.22, 0.75, progress);
                    const outsideGrip = lerp(0.85, 1.30, progress);

                    // Interpolacja w poprzek toru od krawężnika do bandy
                    grip = lerp(insideGrip, outsideGrip, laneRatio);
                    dirt = lerp(0.1 + (laneRatio * 0.3), 0.1 + (laneRatio * 0.9), progress);
                }

                this.cells[s][l].grip = grip;
                this.cells[s][l].dirt = dirt;
            }
        }
    }

    /**
     * Zwraca komórkę siatki, w której znajduje się punkt (px, py)
     * @param {number} px 
     * @param {number} py 
     * @returns {{ s: number, lane: number, grip: number, dirt: number } | null}
     */
    getCellAt(px, py) {
        const { trackCenterY, leftArcCenterX, rightArcCenterX, innerRadius, outerRadius, laneWidth, straightLength } = this.track;
        const L = this.numLanes;
        const S_SEC = this.segmentsPerSection;

        // 1. Sprawdzenie, czy punkt leży na prostych
        if (px >= leftArcCenterX && px <= rightArcCenterX) {
            if (py >= trackCenterY + innerRadius && py <= trackCenterY + outerRadius) {
                // Prosta dolna (Sekcja 0, jazda w prawo)
                const t = clamp((px - leftArcCenterX) / straightLength, 0, 0.999);
                const s = Math.floor(t * S_SEC);
                const dist = py - (trackCenterY + innerRadius);
                const l = clamp(Math.floor((dist / laneWidth) * L), 0, L - 1);
                return this.cells[s][l];
            } else if (py <= trackCenterY - innerRadius && py >= trackCenterY - outerRadius) {
                // Prosta górna (Sekcja 2, jazda w lewo)
                const t = clamp((rightArcCenterX - px) / straightLength, 0, 0.999);
                const s = 2 * S_SEC + Math.floor(t * S_SEC);
                const dist = (trackCenterY - innerRadius) - py;
                const l = clamp(Math.floor((dist / laneWidth) * L), 0, L - 1);
                return this.cells[s][l];
            }
        }

        // 2. Sprawdzenie prawego łuku (Sekcja 1)
        if (px > rightArcCenterX) {
            const dx = px - rightArcCenterX;
            const dy = py - trackCenterY;
            const distCenter = Math.sqrt(dx * dx + dy * dy);

            if (distCenter >= innerRadius && distCenter <= outerRadius) {
                // Kąt w układzie ekranowym: od +PI/2 (dół) przez 0 (prawo) do -PI/2 (góra)
                const angle = Math.atan2(dy, dx); // [-PI, PI]
                const t = clamp((Math.PI / 2 - angle) / Math.PI, 0, 0.999);
                const s = 1 * S_SEC + Math.floor(t * S_SEC);
                const dist = distCenter - innerRadius;
                const l = clamp(Math.floor((dist / laneWidth) * L), 0, L - 1);
                return this.cells[s][l];
            }
        }

        // 3. Sprawdzenie lewego łuku (Sekcja 3)
        if (px < leftArcCenterX) {
            const dx = px - leftArcCenterX;
            const dy = py - trackCenterY;
            const distCenter = Math.sqrt(dx * dx + dy * dy);

            if (distCenter >= innerRadius && distCenter <= outerRadius) {
                // Kąt w układzie ekranowym: od -PI/2 (góra) przez +-PI (lewo) do +PI/2 (dół)
                const angle = Math.atan2(dy, dx);
                let dAngle = 0;
                if (angle < 0) {
                    dAngle = -angle - Math.PI / 2; // od 0 (-PI/2) do PI/2 (-PI)
                } else {
                    dAngle = Math.PI / 2 + (Math.PI - angle); // od PI/2 (PI) do PI (+PI/2)
                }
                const t = clamp(dAngle / Math.PI, 0, 0.999);
                const s = 3 * S_SEC + Math.floor(t * S_SEC);
                const dist = distCenter - innerRadius;
                const l = clamp(Math.floor((dist / laneWidth) * L), 0, L - 1);
                return this.cells[s][l];
            }
        }

        return null;
    }

    /**
     * Zwraca współrzędne (x, y) dla danego punktu toru w parametryzacji (sekcja, postęp t, promień r)
     */
    getPointAt(section, t, radius) {
        const { trackCenterY, leftArcCenterX, rightArcCenterX, straightLength } = this.track;

        if (section === 0) {
            // Prosta dolna: w prawo
            const x = leftArcCenterX + t * straightLength;
            const y = trackCenterY + radius;
            return { x, y };
        } else if (section === 1) {
            // Prawy łuk: od +PI/2 do -PI/2
            const theta = Math.PI / 2 - t * Math.PI;
            const x = rightArcCenterX + radius * Math.cos(theta);
            const y = trackCenterY + radius * Math.sin(theta);
            return { x, y };
        } else if (section === 2) {
            // Prosta górna: w lewo
            const x = rightArcCenterX - t * straightLength;
            const y = trackCenterY - radius;
            return { x, y };
        } else {
            // Lewy łuk: od -PI/2 przez -PI do +PI/2
            const theta = -Math.PI / 2 - t * Math.PI;
            const x = leftArcCenterX + radius * Math.cos(theta);
            const y = trackCenterY + radius * Math.sin(theta);
            return { x, y };
        }
    }

    /**
     * Zwraca środek komórki w przestrzeni świata (x, y)
     * @param {number} s - indeks segmentu
     * @param {number} l - indeks pasa
     * @returns {{ x: number, y: number }}
     */
    getCellCenter(s, l) {
        const section = Math.floor(s / this.segmentsPerSection);
        const t0 = (s % this.segmentsPerSection) / this.segmentsPerSection;
        const t1 = (s % this.segmentsPerSection + 1) / this.segmentsPerSection;
        const tMid = (t0 + t1) / 2;

        const deltaR = this.track.laneWidth / this.numLanes;
        const rMid = this.track.innerRadius + (l + 0.5) * deltaR;

        return this.getPointAt(section, tMid, rMid);
    }

    /**
     * Zwraca 4 wierzchołki czworokąta komórki [p1, p2, p3, p4]
     */
    getCellPolygon(s, l) {
        const section = Math.floor(s / this.segmentsPerSection);
        const t0 = (s % this.segmentsPerSection) / this.segmentsPerSection;
        const t1 = (s % this.segmentsPerSection + 1) / this.segmentsPerSection;

        const deltaR = this.track.laneWidth / this.numLanes;
        const rInner = this.track.innerRadius + l * deltaR;
        const rOuter = this.track.innerRadius + (l + 1) * deltaR;

        const p1 = this.getPointAt(section, t0, rInner);
        const p2 = this.getPointAt(section, t1, rInner);
        const p3 = this.getPointAt(section, t1, rOuter);
        const p4 = this.getPointAt(section, t0, rOuter);

        return [p1, p2, p3, p4];
    }

    /**
     * Wyznacza optymalną ścieżkę (Optimal Racing Line) łącząc środki najszybszych komórek
     * @returns {Array<{ s: number, lane: number, x: number, y: number, grip: number }>}
     */
    getOptimalLine() {
        const path = [];

        for (let s = 0; s < this.totalSegments; s++) {
            let bestLane = 0;
            let bestScore = -Infinity;

            for (let l = 0; l < this.numLanes; l++) {
                const cell = this.cells[s][l];
                // W wycenie bierzemy pod uwagę przyczepność (grip)
                if (cell.grip > bestScore) {
                    bestScore = cell.grip;
                    bestLane = l;
                }
            }

            const center = this.getCellCenter(s, bestLane);
            path.push({
                s,
                lane: bestLane,
                x: center.x,
                y: center.y,
                grip: bestScore
            });
        }

        return path;
    }

    /**
     * Rysuje heatmapę przyczepności na przekazanym obiekcie Phaser.GameObjects.Graphics
     * @param {Phaser.GameObjects.Graphics} graphics 
     */
    drawHeatmap(graphics) {
        for (let s = 0; s < this.totalSegments; s++) {
            for (let l = 0; l < this.numLanes; l++) {
                const cell = this.cells[s][l];
                const poly = this.getCellPolygon(s, l);

                // Kolorowanie w stylu heatmapy GIS (od chłodnego do gorącego/przyczepnego):
                // grip 0.75 (niebieski/ciemny) -> 1.0 (zielony/żółty) -> 1.30 (ognisty pomarańcz/czerwień)
                let color = 0x228833;
                let alpha = 0.28;

                if (cell.grip < 0.90) {
                    color = 0x2255aa; // Mało przyczepny (niebieski)
                    alpha = 0.25;
                } else if (cell.grip < 1.05) {
                    color = 0x22aa66; // Standardowy (zielony)
                    alpha = 0.28;
                } else if (cell.grip < 1.18) {
                    color = 0xddaa00; // Dobra przyczepność (żółty/złoty)
                    alpha = 0.35;
                } else {
                    color = 0xff3300; // Maksymalna przyczepność / kopalnia prędkości (czerwony)
                    alpha = 0.42;
                }

                graphics.fillStyle(color, alpha);
                graphics.beginPath();
                graphics.moveTo(poly[0].x, poly[0].y);
                graphics.lineTo(poly[1].x, poly[1].y);
                graphics.lineTo(poly[2].x, poly[2].y);
                graphics.lineTo(poly[3].x, poly[3].y);
                graphics.closePath();
                graphics.fillPath();

                // Cienka linia siatki
                graphics.lineStyle(1, 0xffffff, 0.06);
                graphics.strokePath();
            }
        }
    }

    /**
     * Rysuje optymalną ścieżkę jako wyraźną, świecącą linię ze znacznikami węzłów
     * @param {Phaser.GameObjects.Graphics} graphics 
     */
    drawOptimalLine(graphics) {
        const path = this.getOptimalLine();
        if (path.length === 0) return;

        // Efekt poświaty (grubsza półprzezroczysta linia pod spodem)
        graphics.lineStyle(6, 0x00ffcc, 0.35);
        graphics.beginPath();
        graphics.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            graphics.lineTo(path[i].x, path[i].y);
        }
        graphics.closePath();
        graphics.strokePath();

        // Główna ostra linia optymalnej ścieżki
        graphics.lineStyle(2, 0xffffff, 0.95);
        graphics.beginPath();
        graphics.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            graphics.lineTo(path[i].x, path[i].y);
        }
        graphics.closePath();
        graphics.strokePath();

        // Punkty węzłowe (punkty kontrolne ścieżki)
        for (let i = 0; i < path.length; i += 2) {
            const pt = path[i];
            graphics.fillStyle(0x00ffff, 0.85);
            graphics.fillCircle(pt.x, pt.y, 2.5);
        }
    }
}
